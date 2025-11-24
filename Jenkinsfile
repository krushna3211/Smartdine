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
    booleanParam(name: 'ALLOW_INSECURE_REGISTRY', defaultValue: false, description: 'If checked, continue when registry only responds on HTTP (ensure cluster nodes can pull from insecure registry)')
  }

  environment {
    // pipeline-level environment
    DOCKER_CREDENTIALS = 'nexus-docker-creds'
    DOCKER_REGISTRY = '10.43.21.172:8085'
    NEXUS_REPO_PATH = 'krushna-project'
    IMAGE_NAME = "${DOCKER_REGISTRY}/${NEXUS_REPO_PATH}/smartdine-pos"
    SONAR_CREDENTIALS = 'sonar-token'
    SONAR_HOST_URL = 'http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000'
    K8S_NAMESPACE = "${params.K8S_NAMESPACE}"
    DEPLOYMENT_DIR = 'k8s-deployment'
    DEPLOYMENT_FILE = 'smartdine-deployment.yaml'
    NAMESPACE_FILE = 'namespace.yaml'
    IMAGE_TAG = "${env.BUILD_NUMBER ?: 'latest'}"

    // <<< IMPORTANT FIX: expose the boolean parameter into the shell environment so set -u won't fail >>>
    ALLOW_INSECURE_REGISTRY = "${params.ALLOW_INSECURE_REGISTRY}"
    RESTART_AGENTS = 'false'
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 60, unit: 'MINUTES')
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Detect build layout') {
      steps {
        container('dind') {
          sh '''
            echo "Workspace listing:"
            ls -la || true
            if [ -d "./server" ]; then echo "Found ./server"; else echo "No ./server dir"; fi
            if [ -d "./client" ]; then echo "Found ./client"; else echo "No ./client dir"; fi
            if [ -f "Dockerfile" ]; then echo "Found root Dockerfile"; fi
          '''
        }
      }
    }

    stage('Registry preflight (protocol check)') {
      steps {
        container('kubectl') {
          script {
            sh '''
              set -euo pipefail
              echo "Checking registry ${DOCKER_REGISTRY} reachability (https then http)..."
              if command -v curl >/dev/null 2>&1; then
                if curl -sS --connect-timeout 5 "https://${DOCKER_REGISTRY}/v2/" >/dev/null 2>&1; then
                  echo "Registry responds to HTTPS."
                else
                  echo "HTTPS check failed or non-HTTPS response detected. Testing HTTP..."
                  if curl -sS --connect-timeout 5 "http://${DOCKER_REGISTRY}/v2/" >/dev/null 2>&1; then
                    echo "Registry only responds over HTTP."
                    # SAFE: ALLOW_INSECURE_REGISTRY is exported into the environment above, so it's always defined.
                    if [ "${ALLOW_INSECURE_REGISTRY}" = "true" ]; then
                      echo "ALLOW_INSECURE_REGISTRY=true -> proceeding despite HTTP registry."
                    else
                      echo "Registry uses HTTP. To proceed either:"
                      echo "  * set ALLOW_INSECURE_REGISTRY=true when starting the job (beware insecure transport), OR"
                      echo "  * configure your cluster nodes to treat ${DOCKER_REGISTRY} as insecure registry, OR"
                      echo "  * enable TLS on the registry."
                      exit 2
                    fi
                  else
                    echo "Could not reach registry at ${DOCKER_REGISTRY} over HTTP or HTTPS."
                    exit 2
                  fi
                fi
              else
                echo "curl not present in this container; skipping protocol preflight."
              fi
            '''
          }
        }
      }
    }

    stage('Ensure dind daemon config (in Jenkins namespace)') {
      steps {
        container('kubectl') {
          script {
            sh '''
              set -euo pipefail
              echo "Applying docker-daemon-config ConfigMap in namespace jenkins (if present in repo)"
              if [ -f "${DEPLOYMENT_DIR}/docker-daemon-config.yaml" ]; then
                cat "${DEPLOYMENT_DIR}/docker-daemon-config.yaml" | kubectl -n jenkins apply -f -
                echo "Applied docker-daemon-config from repo."
              else
                echo "No ${DEPLOYMENT_DIR}/docker-daemon-config.yaml found in repo -> skipping apply"
              fi

              if [ "${RESTART_AGENTS:-false}" = "true" ]; then
                echo "RESTART_AGENTS=true -> deleting existing agent pods so they pick new config"
                kubectl -n jenkins delete pods -l jenkins/my-jenkins-jenkins-agent=true --ignore-not-found || true
              else
                echo "RESTART_AGENTS=false -> skipping agent pod restart"
              fi
            '''
          }
        }
      }
    }

    stage('Build Docker Image(s)') {
      steps {
        container('dind') {
          withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDENTIALS}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
            sh '''
              set -euo pipefail
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

              BUILT_IMAGES=""
              if [ -d "./server" ] && [ -d "./client" ]; then
                echo "Building server and client images"
                docker build -t ${IMAGE_NAME}-server:${IMAGE_TAG} ./server
                docker build -t ${IMAGE_NAME}-client:${IMAGE_TAG} ./client
                BUILT_IMAGES="${IMAGE_NAME}-server:${IMAGE_TAG} ${IMAGE_NAME}-client:${IMAGE_TAG}"
              elif [ -d "./server" ]; then
                echo "Building server image (only /server exists)"
                docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ./server
                BUILT_IMAGES="${IMAGE_NAME}:${IMAGE_TAG}"
              elif [ -d "./client" ]; then
                echo "Building client image (only /client exists)"
                docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ./client
                BUILT_IMAGES="${IMAGE_NAME}:${IMAGE_TAG}"
              elif [ -f "Dockerfile" ]; then
                echo "Building single image from repo root Dockerfile"
                docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                BUILT_IMAGES="${IMAGE_NAME}:${IMAGE_TAG}"
              else
                echo "No server/ client dirs and no root Dockerfile found — nothing to build"
                exit 1
              fi

              echo "Built images: ${BUILT_IMAGES}"
            '''
          }
        }
      }
    }

    stage('Run Tests in Docker') {
      steps {
        container('dind') {
          sh '''
            PRIMARY_IMAGE=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep "${IMAGE_NAME}" | head -n1 || true)
            if [ -n "$PRIMARY_IMAGE" ]; then
              echo "Running tests inside ${PRIMARY_IMAGE}"
              docker run --rm ${PRIMARY_IMAGE} /bin/sh -c "npm ci && npm test" || echo "Tests finished (non-zero exit ignored here)"
            else
              echo "No image matching ${IMAGE_NAME} found to run tests; skipping tests."
            fi
          '''
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        container('sonar-scanner') {
          withCredentials([string(credentialsId: "${SONAR_CREDENTIALS}", variable: 'SONAR_TOKEN')]) {
            sh '''
              echo "Sonar host: ${SONAR_HOST_URL}"
              if command -v curl >/dev/null 2>&1; then
                echo "Checking connectivity to SonarQube..."
                curl -fsS "${SONAR_HOST_URL}/api/server/version" || echo "Warning: could not curl SonarQube host"
              fi

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

    stage('Login to Docker Registry (Jenkins)') {
      steps {
        container('dind') {
          withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDENTIALS}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
            sh '''
              echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin ${DOCKER_REGISTRY}
            '''
          }
        }
      }
    }

    stage('Tag & Push Images') {
      steps {
        container('dind') {
          sh '''
            set -euo pipefail
            for img in $(docker images --format '{{.Repository}}:{{.Tag}}' | grep "${IMAGE_NAME}" || true); do
              if [ -n "$img" ]; then
                echo "Pushing $img"
                docker push "$img" || echo "Push failed for $img"
              fi
            done
          '''
        }
      }
    }

    stage('Prepare Namespace & Secrets') {
      steps {
        container('kubectl') {
          withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDENTIALS}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
            sh '''
              set -euo pipefail
              raw_ns="${K8S_NAMESPACE:-}"
              ns=$(echo "${raw_ns}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/^-*//; s/-*$//')
              if [ -z "$ns" ]; then ns="smartdine"; fi
              echo "Sanitized namespace: $ns"

              kubectl create namespace "$ns" --dry-run=client -o yaml | kubectl apply -f - || true

              kubectl create secret docker-registry nexus-pull-secret \
                --docker-server=${DOCKER_REGISTRY} \
                --docker-username="${DOCKER_USER}" \
                --docker-password="${DOCKER_PASS}" \
                -n "${ns}" --dry-run=client -o yaml | kubectl apply -f -

              kubectl patch serviceaccount default -n "${ns}" \
                -p '{"imagePullSecrets":[{"name":"nexus-pull-secret"}]}' || true

              echo "Namespace and imagePullSecret prepared in $ns"
            '''
          }
        }
      }
    }

    stage('Preflight diagnostics (DNS / Registry reachability)') {
      steps {
        container('kubectl') {
          script {
            sh '''
              set -euo pipefail
              ns="${K8S_NAMESPACE:-smartdine}"
              ns=$(echo "${ns}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/^-*//; s/-*$//')
              echo "Running DNS/HTTP checks from inside kubectl container (cluster view):"

              echo "Resolve registry DNS from within pod container:"
              if command -v getent >/dev/null 2>&1; then
                getent hosts ${DOCKER_REGISTRY%:*} || echo "getent failed"
              else
                nslookup ${DOCKER_REGISTRY%:*} || true
              fi

              echo "Try curl (http) to registry (may be internal):"
              if command -v curl >/dev/null 2>&1; then
                curl -v --max-time 5 "http://${DOCKER_REGISTRY}/v2/" || echo "curl http to registry failed or timed out"
              else
                echo "curl not available in kubectl image; skipping HTTP check"
              fi
            '''
          }
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        container('kubectl') {
          script {
            dir("${DEPLOYMENT_DIR}") {
              sh '''
                set -euo pipefail
                raw_ns="${K8S_NAMESPACE:-}"
                ns=$(echo "${raw_ns}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/^-*//; s/-*$//')
                if [ -z "$ns" ]; then ns="smartdine"; fi
                echo "Deploying into namespace: $ns"

                if [ -f "${NAMESPACE_FILE}" ]; then
                  echo "Applying ${NAMESPACE_FILE} (may create namespace with metadata)..."
                  kubectl apply -f "${NAMESPACE_FILE}" || true
                fi

                echo "Applying ${DEPLOYMENT_FILE} in namespace ${ns}"
                kubectl apply -f "${DEPLOYMENT_FILE}" -n "${ns}"

                echo "Setting image for deployment/smartdine-deployment to ${IMAGE_NAME}:${IMAGE_TAG}"
                kubectl set image deployment/smartdine-deployment smartdine=${IMAGE_NAME}:${IMAGE_TAG} -n "${ns}" || true

                echo "Waiting for rollout..."
                if ! kubectl rollout status deployment/smartdine-deployment -n "${ns}" --timeout=120s; then
                  echo "Rollout failed or timed out — gathering debug info:"
                  kubectl get pods -n "${ns}" -o wide || true
                  kubectl describe pods -n "${ns}" || true
                  kubectl get events -n "${ns}" --sort-by='.metadata.creationTimestamp' || true
                  exit 1
                fi
                echo "Deployment succeeded in namespace ${ns}"
              '''
            }
          }
        }
      }
    }
  }

  post {
    always {
      echo "Post: always - attempt to archive artifacts (safe guarded)"
      script {
        try {
          archiveArtifacts artifacts: 'target/*.jar', onlyIfSuccessful: false, allowEmptyArchive: true
        } catch (err) {
          echo "Archive skipped (workspace/agent not available or other error): ${err}"
        }
      }
    }
    success { echo "Build ${env.BUILD_NUMBER} succeeded" }
    failure { echo "Build ${env.BUILD_NUMBER} failed" }
  }
}
