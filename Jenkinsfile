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
  - name: dind
    image: docker:dind
    args: ["--registry-mirror=https://mirror.gcr.io", "--storage-driver=overlay2"]
    securityContext:
      privileged: true
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
    volumeMounts:
    - name: docker-config
      mountPath: /etc/docker/daemon.json
      subPath: daemon.json
  volumes:
  - name: docker-config
    configMap:
      name: docker-daemon-config
  - name: kubeconfig-secret
    secret:
      secretName: kubeconfig-secret
'''
    }
  }

  environment {
    DOCKER_CREDENTIALS = 'nexus-docker-creds'
    DOCKER_REGISTRY = 'nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085'
    NEXUS_REPO_PATH = 'krushna-project'
    IMAGE_NAME = "${DOCKER_REGISTRY}/${NEXUS_REPO_PATH}/smartdine-pos"
    SONAR_CREDENTIALS = 'sonar-token'
    SONAR_HOST_URL = 'http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000'
    K8S_NAMESPACE = 'YOUR_NAMESPACE'
    DEPLOYMENT_DIR = 'k8s-deployment'
    DEPLOYMENT_FILE = 'smartdine-deployment.yaml'
    IMAGE_TAG = "${env.BUILD_NUMBER ?: 'latest'}"
  }

  options {
    // timestamps() removed because it's not available in your Jenkins
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 60, unit: 'MINUTES')
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
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
          sh 'docker run --rm ${IMAGE_NAME}:${IMAGE_TAG} /bin/sh -c "npm ci && npm test"'
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        container('sonar-scanner') {
          withCredentials([string(credentialsId: "${SONAR_CREDENTIALS}", variable: 'SONAR_TOKEN')]) {
            sh """
              sonar-scanner \
                -Dsonar.projectKey=Krushna-project \
                -Dsonar.host.url=${SONAR_HOST_URL} \
                -Dsonar.login=${SONAR_TOKEN} \
                -Dsonar.sources=. \
                -Dsonar.exclusions=node_modules/**
            """
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
            // debug listing to help trace issues
            sh 'echo "Repo k8s-deployment contents:"; ls -la || true'

            // Ensure namespace exists (create if missing)
            sh '''
                echo "Checking namespace: ${K8S_NAMESPACE}"
                if ! kubectl get namespace ${K8S_NAMESPACE} >/dev/null 2>&1; then
                echo "Namespace ${K8S_NAMESPACE} not found — creating it."
                kubectl create namespace ${K8S_NAMESPACE}
                else
                echo "Namespace ${K8S_NAMESPACE} already exists."
                fi
            '''

            // Apply the manifest (manifest file should be in k8s-deployment/${DEPLOYMENT_FILE})
            sh """
                echo "Applying manifest ${DEPLOYMENT_FILE} to namespace ${K8S_NAMESPACE}..."
                kubectl apply -f ${DEPLOYMENT_FILE} -n ${K8S_NAMESPACE}
            """

            // Ensure deployment uses current image and wait for rollout
            sh """
                echo "Setting image to ${IMAGE_NAME}:${IMAGE_TAG} (idempotent)..."
                kubectl set image deployment/smartdine-deployment smartdine=${IMAGE_NAME}:${IMAGE_TAG} -n ${K8S_NAMESPACE} || true

                echo "Waiting for rollout..."
                kubectl rollout status deployment/smartdine-deployment -n ${K8S_NAMESPACE} --timeout=120s
            """

            // If rollout not ready, dump debugging info
            sh '''
                if ! kubectl get deploy smartdine-deployment -n ${K8S_NAMESPACE} -o jsonpath="{.status.conditions[?(@.type=='Available')].status}" | grep True; then
                echo "Rollout may have failed — printing pods and events:"
                kubectl get pods -n ${K8S_NAMESPACE} -o wide || true
                kubectl describe pods -n ${K8S_NAMESPACE} || true
                kubectl get events -n ${K8S_NAMESPACE} --sort-by='.metadata.creationTimestamp' || true
                exit 1
                fi
            '''
            } // dir
        } // script
        } // container
    } // steps
    } // stage

  } // end stages

  post {
    always {
      archiveArtifacts artifacts: 'target/*.jar', onlyIfSuccessful: false, allowEmptyArchive: true
    }
    success { echo "Build ${env.BUILD_NUMBER} succeeded" }
    failure { echo "Build ${env.BUILD_NUMBER} failed" }
  }
}
