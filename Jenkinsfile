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
    // Replace these with the real Jenkins credential IDs and registry
    DOCKER_CREDENTIALS = 'nexus-docker-creds'            // username/password credential ID for Nexus
    DOCKER_REGISTRY = 'nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085'
    NEXUS_REPO_PATH = 'krushna-project'                 // your repo path in Nexus
    IMAGE_NAME = "${DOCKER_REGISTRY}/${NEXUS_REPO_PATH}/smartdine-pos"
    SONAR_CREDENTIALS = 'sonar-token'                   // Jenkins string credential containing Sonar token
    SONAR_HOST_URL = 'http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000'
    K8S_NAMESPACE = 'YOUR_NAMESPACE'                    // replace with your k8s namespace
    DEPLOYMENT_DIR = 'k8s-deployment'                   // folder containing your k8s yaml
    DEPLOYMENT_FILE = 'smartdine-deployment.yaml'       // filename to apply
    IMAGE_TAG = "${env.BUILD_NUMBER ?: 'latest'}"
  }

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 60, unit: 'MINUTES')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
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
              sh """
                echo "Applying Kubernetes manifests..."
                kubectl apply -f ${DEPLOYMENT_FILE} -n ${K8S_NAMESPACE} --record

                echo "Updating image in deployment (if using imageUpdate)"
                kubectl set image deployment/smartdine-deployment smartdine=${IMAGE_NAME}:${IMAGE_TAG} -n ${K8S_NAMESPACE} || true

                echo "Waiting for rollout..."
                kubectl rollout status deployment/smartdine-deployment -n ${K8S_NAMESPACE}
              """
            }
          }
        }
      }
    }
  } // end stages

  post {
    always {
      echo "Post: always - cleanup"
      archiveArtifacts artifacts: 'target/*.jar', onlyIfSuccessful: false, allowEmptyArchive: true
    }
    success {
      echo "Build ${env.BUILD_NUMBER} succeeded"
    }
    failure {
      echo "Build ${env.BUILD_NUMBER} failed"
    }
  }
}
