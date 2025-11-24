pipeline {
  agent {
    kubernetes {
      yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: sonar-scanner
    image: sonarsource/sonar-scanner-cli
    command:
    - cat
    tty: true
    volumeMounts:
    - mountPath: /home/jenkins/agent
      name: workspace-volume
  - name: kubectl
    image: bitnami/kubectl:latest
    command:
    - cat
    tty: true
    securityContext:
      runAsUser: 0
      readOnlyRootFilesystem: false
    env:
    - name: KUBECONFIG
      value: /kube/config
    volumeMounts:
    - name: kubeconfig-secret
      mountPath: /kube/config
      subPath: kubeconfig
    - mountPath: /home/jenkins/agent
      name: workspace-volume
  - name: dind
    image: docker:dind
    args: ["--registry-mirror=https://mirror.gcr.io", "--storage-driver=overlay2"]
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
    securityContext:
      privileged: true
    volumeMounts:
    - mountPath: /etc/docker/daemon.json
      name: docker-config
      subPath: daemon.json
    - mountPath: /home/jenkins/agent
      name: workspace-volume
  - name: jnlp
    image: jenkins/inbound-agent:3309.v27b_9314fd1a_4-1
    env:
    - name: JENKINS_URL
      value: "http://my-jenkins.jenkins.svc.cluster.local:8080/"
    volumeMounts:
    - mountPath: /home/jenkins/agent
      name: workspace-volume
  nodeSelector:
    kubernetes.io/os: "linux"
  restartPolicy: Never
  volumes:
  - name: docker-config
    configMap:
      name: docker-daemon-config
  - name: workspace-volume
    emptyDir: {}
  - name: kubeconfig-secret
    secret:
      secretName: kubeconfig-secret
'''
    }
  }

  parameters {
    string(name: 'K8S_NAMESPACE', defaultValue: 'smartdine', description: 'Namespace to deploy into (will be sanitized)')
  }

  environment {
    DOCKER_CREDENTIALS = 'nexus-docker-creds'
    DOCKER_REGISTRY = 'nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085'
    NEXUS_REPO_PATH = 'krushna-project'
    IMAGE_NAME = "${DOCKER_REGISTRY}/${NEXUS_REPO_PATH}/smartdine-pos"
    SONAR_CREDENTIALS = 'sonar-token'
    SONAR_HOST_URL = 'http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000'
    K8S_NAMESPACE = "${params.K8S_NAMESPACE}"
    DEPLOYMENT_DIR = 'k8s-deployment'
    DEPLOYMENT_FILE = 'smartdine-deployment.yaml'
    NAMESPACE_FILE = 'namespace.yaml'
    IMAGE_TAG = "${env.BUILD_NUMBER ?: 'latest'}"
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 60, unit: 'MINUTES')
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build') {
      steps { echo "Build placeholder" }
    }

    stage('Build Docker Image') {
      steps {
        container('dind') {
          sh '''
            echo "Waiting for Docker daemon..."
            retries=0
            until docker info > /dev/null 2>&1 || [ $retries -ge 30 ]; do
              echo "Docker not ready yet... retry $retries"
              sleep 2
              retries=$((retries+1))
            done
            if ! docker info > /dev/null 2>&1; then
              echo "Docker daemon did not become ready"
              exit 1
            fi
            echo "Building image ${IMAGE_NAME}:${IMAGE_TAG}"
            docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
            docker image ls ${IMAGE_NAME} || true
          '''
        }
      }
    }

    stage('Run Tests in Docker') {
      steps {
        container('dind') {
          sh '''
            echo "Running tests inside image..."
            docker run --rm ${IMAGE_NAME}:${IMAGE_TAG} /bin/sh -c "npm ci && npm test"
          '''
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        container('sonar-scanner') {
          // withCredentials places SONAR_TOKEN into the shell environment of sh steps
          withCredentials([string(credentialsId: "${SONAR_CREDENTIALS}", variable: 'SONAR_TOKEN')]) {
            // NOTE: use double quotes for ${SONAR_HOST_URL} so the shell expands it,
            // and use $SONAR_TOKEN (shell var) to avoid Groovy-string secret interpolation.
            sh '''
              echo "Sonar host: ${SONAR_HOST_URL}"
              # quick connectivity check: try the base /api/version endpoint for sanity (non-fatal)
              if command -v curl >/dev/null 2>&1; then
                echo "Checking connectivity to SonarQube..."
                curl -fsS "${SONAR_HOST_URL}/api/server/version" || echo "Warning: could not curl SonarQube host"
              else
                echo "curl not available inside sonar-scanner image; skipping connectivity check."
              fi

              # Run sonar-scanner using shell-expanded variables
              sonar-scanner \
                -Dsonar.projectKey=Krushna-project \
                -Dsonar.host.url="${SONAR_HOST_URL}" \
                -Dsonar.token="$SONAR_TOKEN" \
                -Dsonar.sources=. \
                -Dsonar.exclusions=node_modules/**
            '''
          }
        }
      }
    }

    stage('Login to Docker Registry') {
      steps {
        container('dind') {
          withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDENTIALS}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
            sh '''
              echo "Docker CLI version:"
              docker --version || true
              echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin ${DOCKER_REGISTRY}
            '''
          }
        }
      }
    }

    stage('Build - Tag - Push') {
      steps {
        container('dind') {
          sh '''
            echo "Tagging and pushing ${IMAGE_NAME}:${IMAGE_TAG}"
            docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:${IMAGE_TAG}
            docker push ${IMAGE_NAME}:${IMAGE_TAG}
          '''
        }
      }
    }

    stage('Deploy Application') {
      steps {
        container('kubectl') {
          script {
            dir("${DEPLOYMENT_DIR}") {
              sh 'echo "Repo k8s-deployment contents:"; ls -la || true'

              sh '''
                echo "Requested namespace (raw): ${K8S_NAMESPACE}"
                ns=$(echo "${K8S_NAMESPACE}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/^-*//; s/-*$//')
                if [ -z "$ns" ]; then
                  ns=smartdine
                fi
                echo "Sanitized namespace: $ns"
                export SANITIZED_NAMESPACE="$ns"
              '''

              sh '''
                if [ -f "${NAMESPACE_FILE}" ]; then
                  echo "Applying ${NAMESPACE_FILE} (if present)..."
                  kubectl apply -f ${NAMESPACE_FILE} || true
                fi
              '''

              sh '''
                echo "Ensure namespace exists: $SANITIZED_NAMESPACE"
                if ! kubectl get namespace "$SANITIZED_NAMESPACE" >/dev/null 2>&1; then
                  echo "Namespace $SANITIZED_NAMESPACE not found — creating it."
                  kubectl create namespace "$SANITIZED_NAMESPACE"
                else
                  echo "Namespace $SANITIZED_NAMESPACE already exists."
                fi
              '''

              sh '''
                echo "Applying manifest ${DEPLOYMENT_FILE} to namespace $SANITIZED_NAMESPACE"
                kubectl apply -f ${DEPLOYMENT_FILE} -n "$SANITIZED_NAMESPACE"

                echo "Setting deployment image (idempotent)..."
                kubectl set image deployment/smartdine-deployment smartdine=${IMAGE_NAME}:${IMAGE_TAG} -n "$SANITIZED_NAMESPACE" || true

                echo "Waiting for rollout..."
                kubectl rollout status deployment/smartdine-deployment -n "$SANITIZED_NAMESPACE" --timeout=120s || true
              '''

              sh '''
                if ! kubectl get deploy smartdine-deployment -n "$SANITIZED_NAMESPACE" -o jsonpath="{.status.conditions[?(@.type=='Available')].status}" | grep True; then
                  echo "Rollout not available — dumping debugging info:"
                  kubectl get pods -n "$SANITIZED_NAMESPACE" -o wide || true
                  kubectl describe pods -n "$SANITIZED_NAMESPACE" || true
                  kubectl get events -n "$SANITIZED_NAMESPACE" --sort-by='.metadata.creationTimestamp' || true
                  exit 1
                fi
              '''
            }
          }
        }
      }
    }
  }

  post {
    always {
      echo "Post: always - archive artifacts if any"
      archiveArtifacts artifacts: 'target/*.jar', onlyIfSuccessful: false, allowEmptyArchive: true
    }
    success { echo "Build ${env.BUILD_NUMBER} succeeded" }
    failure { echo "Build ${env.BUILD_NUMBER} failed" }
  }
}
