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
    booleanParam(name: 'RESTART_AGENTS', defaultValue: false, description: 'Recreate Jenkins agent pods after applying docker daemon config in jenkins ns')
  }

  environment {
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
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 60, unit: 'MINUTES')
  }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Detect build layout') {
      steps { container('dind') { sh '''echo "Workspace listing:"; ls -la || true; if [ -f Dockerfile ]; then echo "Found root Dockerfile"; fi''' } }
    }

    stage('Registry preflight (protocol check)') {
      steps {
        container('kubectl') {
          sh '''
            set -euo pipefail
            echo "Checking registry ${DOCKER_REGISTRY} reachability (https then http)..."

            # check https
            if command -v curl >/dev/null 2>&1; then
              if curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://${DOCKER_REGISTRY}/v2/" >/dev/null 2>&1; then
                echo "Registry responds to HTTPS (OK)"
              else
                echo "HTTPS check failed or non-HTTPS response detected. Testing HTTP..."
                if curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://${DOCKER_REGISTRY}/v2/" >/dev/null 2>&1; then
                  echo "Registry only responds over HTTP. Kubernetes nodes will attempt HTTPS by default, causing ImagePullBackOff."
                  echo ""
                  echo "ACTION REQUIRED (choose one):"
                  echo "  1) Configure your cluster nodes' container runtime to treat ${DOCKER_REGISTRY} as an insecure (HTTP) registry."
                  echo "     - For Docker: add to /etc/docker/daemon.json:"
                  echo "         { \"insecure-registries\": [\"${DOCKER_REGISTRY}\"] }"
                  echo "       then systemctl restart docker"
                  echo "     - For containerd: add a registry mirror entry and use http endpoint. Example:"
                  echo "         sudo mkdir -p /etc/containerd && containerd config default > /etc/containerd/config.toml"
                  echo "         edit /etc/containerd/config.toml ->"
                  echo "         [plugins.\"io.containerd.grpc.v1.cri\".registry.mirrors.\"${DOCKER_REGISTRY%:*}:8085\"]"
                  echo "           endpoint = [\"http://${DOCKER_REGISTRY}\"]"
                  echo "         then systemctl restart containerd"
                  echo ""
                  echo "  2) Make the registry serve HTTPS (install TLS) so nodes can fetch securely."
                  echo ""
                  echo "Because the registry is HTTP, this pipeline will stop now to avoid wasted pushes. Fix nodes or enable HTTPS and retry."
                  exit 2
                else
                  echo "Registry not reachable over HTTP or HTTPS from this pod. Check network/DNS."
                  exit 3
                fi
              fi
            else
              echo "curl not available in this container image; skipping protocol checks."
            fi
          '''
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
                echo "Docker not ready yet... retry $retries"; sleep 2; retries=$((retries+1))
              done
              if ! docker info > /dev/null 2>&1; then echo "Docker daemon did not become ready"; exit 1; fi

              # build (same logic as before)
              if [ -f "Dockerfile" ]; then
                docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                BUILT_IMAGES="${IMAGE_NAME}:${IMAGE_TAG}"
              else
                echo "No Dockerfile found" && exit 1
              fi
              echo "Built images: ${BUILT_IMAGES}"
            '''
          }
        }
      }
    }

    stage('Login to Docker Registry (Jenkins)') {
      steps {
        container('dind') {
          withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDENTIALS}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
            sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin ${DOCKER_REGISTRY}'
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
              if [ -n "$img" ]; then echo "Pushing $img"; docker push "$img" || echo "Push failed for $img"; fi
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
              raw_ns="${K8S_NAMESPACE:-}"; ns=$(echo "${raw_ns}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/^-*//; s/-*$//')
              if [ -z "$ns" ]; then ns="smartdine"; fi
              kubectl create namespace "$ns" --dry-run=client -o yaml | kubectl apply -f - || true

              kubectl create secret docker-registry nexus-pull-secret \
                --docker-server=${DOCKER_REGISTRY} \
                --docker-username="${DOCKER_USER}" \
                --docker-password="${DOCKER_PASS}" \
                -n "${ns}" --dry-run=client -o yaml | kubectl apply -f -

              # ensure default SA references the secret
              kubectl patch serviceaccount default -n "${ns}" \
                -p '{"imagePullSecrets":[{"name":"nexus-pull-secret"}]}' || true

              echo "Namespace and imagePullSecret prepared in $ns"
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
                raw_ns="${K8S_NAMESPACE:-}"; ns=$(echo "${raw_ns}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/^-*//; s/-*$//')
                if [ -z "$ns" ]; then ns="smartdine"; fi

                if [ -f "${NAMESPACE_FILE}" ]; then kubectl apply -f "${NAMESPACE_FILE}" || true; fi
                kubectl apply -f "${DEPLOYMENT_FILE}" -n "${ns}"
                kubectl set image deployment/smartdine-deployment smartdine=${IMAGE_NAME}:${IMAGE_TAG} -n "${ns}" || true

                # ensure deployment uses the pull secret (idempotent)
                kubectl patch deployment smartdine-deployment -n "${ns}" --type='json' \
                  -p '[{"op":"add","path":"/spec/template/spec/imagePullSecrets","value":[{"name":"nexus-pull-secret"}]}]' || true

                if ! kubectl rollout status deployment/smartdine-deployment -n "${ns}" --timeout=120s; then
                  echo "Rollout failed; gathering debug info"; kubectl get pods -n "${ns}" -o wide || true; kubectl describe pods -n "${ns}" || true; kubectl get events -n "${ns}" --sort-by=.metadata.creationTimestamp || true; exit 1
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
