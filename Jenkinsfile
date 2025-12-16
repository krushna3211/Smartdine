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
    command: ["cat"]
    tty: true
  - name: kubectl
    image: bitnami/kubectl:latest
    command: ["cat"]
    tty: true
    securityContext:
      runAsUser: 0
    env:
    - name: KUBECONFIG
      value: /kube/config
    volumeMounts:
    - name: kubeconfig-secret
      mountPath: /kube/config
      subPath: kubeconfig
  - name: dind
    image: docker:dind
    securityContext:
      privileged: true
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
    args:
    - "--storage-driver=overlay2"
    volumeMounts:
    - name: docker-config
      mountPath: /etc/docker/daemon.json
      subPath: daemon.json
    - name: workspace-volume
      mountPath: /home/jenkins/agent
  - name: jnlp
    image: jenkins/inbound-agent:3309.v27b_9314fd1a_4-1
    env:
    - name: JENKINS_AGENT_WORKDIR
      value: "/home/jenkins/agent"
    volumeMounts:
    - mountPath: "/home/jenkins/agent"
      name: workspace-volume
  volumes:
  - name: workspace-volume
    emptyDir: {}
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
        NEXUS_REGISTRY = '10.43.21.172:8085'
        REPO_NAME = 'krushna-project'
        IMAGE_NAME = 'smartdine-pos'
        K8S_NAMESPACE = 'smartdine'
    }

    stages {
        stage('CHECK') {
            steps {
                echo "DEBUG >>> Smartdine Jenkinsfile active"
            }
        }

        stage('Build Docker Image') {
            steps {
                container('dind') {
                    sh '''
                        echo "Waiting for Docker daemon..."
                        for i in $(seq 1 30); do
                            docker info >/dev/null 2>&1 && break
                            echo "dockerd not ready ($i)..."
                            sleep 2
                        done

                        # Build image from repo root Dockerfile
                        docker build -t ${IMAGE_NAME}:latest .
                        docker image ls | grep "${IMAGE_NAME}" || true
                    '''
                }
            }
        }

        stage('SonarQube Scan') {
            steps {
                container('sonar-scanner') {
                    withCredentials([string(credentialsId: 'sonar_token_2401126', variable: 'SONAR_TOKEN')]) {
                        sh '''
                            sonar-scanner \
                                -Dsonar.projectKey=2401126-Smartdine \
                                -Dsonar.sources=. \
                                -Dsonar.host.url=http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000 \
                                -Dsonar.token=squ_82487ffedd6bf967f6254fccccb56f3973eb2eee
                        '''
                    }
                }
            }
        }

        stage('Login to Nexus Registry') {
            steps {
                container('dind') {
                    withCredentials([usernamePassword(credentialsId: 'nexus-docker-creds', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                        sh '''
                            echo "Docker version:"
                            docker --version || true
                            sleep 2
                            echo "$NEXUS_PASS" | docker login ${NEXUS_REGISTRY} -u "$NEXUS_USER" --password-stdin
                        '''
                    }
                }
            }
        }

        stage('Tag + Push Images') {
            steps {
                container('dind') {
                    withCredentials([usernamePassword(credentialsId: 'nexus-docker-creds', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                        sh '''
                            set -euo pipefail
                            TAG=${BUILD_NUMBER}
                            TARGET=${NEXUS_REGISTRY}/${REPO_NAME}/${IMAGE_NAME}

                            echo "Tagging image -> ${TARGET}:${TAG} and :latest"
                            docker tag ${IMAGE_NAME}:latest ${TARGET}:${TAG}
                            docker tag ${IMAGE_NAME}:latest ${TARGET}:latest

                            echo "Pushing ${TARGET}:${TAG}"
                            docker push ${TARGET}:${TAG}

                            echo "Pushing ${TARGET}:latest"
                            docker push ${TARGET}:latest
                        '''
                    }
                }
            }
        }

        stage('Create Namespace & ImagePullSecret') {
            steps {
                container('kubectl') {
                    withCredentials([usernamePassword(credentialsId: 'nexus-docker-creds', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                        sh '''
                            # Ensure namespace exists
                            kubectl get namespace ${K8S_NAMESPACE} >/dev/null 2>&1 || kubectl create namespace ${K8S_NAMESPACE}

                            # Create/patch imagePull secret in the namespace
                            kubectl create secret docker-registry nexus-pull-secret \
                              --docker-server=${NEXUS_REGISTRY} \
                              --docker-username=${NEXUS_USER} \
                              --docker-password=${NEXUS_PASS} \
                              --namespace=${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

                            # Patch default service account to use the pull secret (idempotent)
                            kubectl patch serviceaccount default -n ${K8S_NAMESPACE} \
                              -p '{"imagePullSecrets":[{"name":"nexus-pull-secret"}]}' || true
                        '''
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                container('kubectl') {
                    dir('k8s-deployment') {
                        sh '''
                            set -euo pipefail
                            TAG=${BUILD_NUMBER}
                            DEPLOY_FILE=smartdine-deployment.yaml

                            # Replace image tag token smartdine-pos:latest -> smartdine-pos:BUILD_NUMBER (works even if registry prefix differs)
                            # This sed replaces occurrences of 'smartdine-pos:latest' with the exact tag we just pushed
                            if grep -q "smartdine-pos:latest" ${DEPLOY_FILE}; then
                              sed -i "s|smartdine-pos:latest|smartdine-pos:${TAG}|g" ${DEPLOY_FILE}
                            else
                              # If deployment file already has a registry prefix, replace the tag portion after image name
                              sed -i "s|${IMAGE_NAME}:.*|${IMAGE_NAME}:${TAG}|g" ${DEPLOY_FILE} || true
                            fi

                            # Apply deployment
                            kubectl apply -f ${DEPLOY_FILE} -n ${K8S_NAMESPACE}

                            # Wait a bit and show pods for quick feedback
                            sleep 5
                            kubectl get pods -n ${K8S_NAMESPACE} -o wide || true
                        '''
                    }
                }
            }
        }
    }
}
