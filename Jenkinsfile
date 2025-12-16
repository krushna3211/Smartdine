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
    image: docker:24-dind
    securityContext:
      privileged: true
    command:
      - dockerd
    args:
      - "--host=unix:///var/run/docker.sock"
      # FIX: We now trust the DNS Name, not the IP
      - "--insecure-registry=nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085"
      - "--storage-driver=overlay2"
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run
    - name: docker-lib
      mountPath: /var/lib/docker

  volumes:
  - name: docker-sock
    emptyDir: {}
  - name: docker-lib
    emptyDir: {}
  - name: kubeconfig-secret
    secret:
      secretName: kubeconfig-secret
'''
        }
    }

    environment {
        // FIX: Switched to Internal DNS Name
        REGISTRY_URL = "nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085"
        PROJECT_NAME = "krushna-project" 
        APP_NAME = "smartdine-pos"
        
        FULL_IMAGE = "${REGISTRY_URL}/${PROJECT_NAME}/${APP_NAME}"
        
        TAG = "${env.BUILD_NUMBER}"
        NAMESPACE = "smartdine"
        
        SONAR_PROJECT_KEY = "2401126-Smartdine"
        SONAR_URL = "http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000"
    }

    stages {

        stage('Build Docker Image') {
            steps {
                container('dind') {
                    sh '''
                        echo "Waiting for Docker..."
                        while ! docker info > /dev/null 2>&1; do sleep 2; done
                        
                        echo "Building ${FULL_IMAGE}:${TAG}..."
                        docker build -t ${FULL_IMAGE}:${TAG} .
                        docker tag ${FULL_IMAGE}:${TAG} ${FULL_IMAGE}:latest
                        docker images
                    '''
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                container('sonar-scanner') {
                    withCredentials([string(credentialsId: 'sonar_token_2401126', variable: 'SONAR_TOKEN')]) {
                        sh '''
                            sonar-scanner \
                              -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                              -Dsonar.sources=. \
                              -Dsonar.host.url=${SONAR_URL} \
                              -Dsonar.login=$SONAR_TOKEN
                        '''
                    }
                }
            }
        }

        stage('Login to Nexus Registry') {
            steps {
                container('dind') {
                    sh '''
                        # Hardcoded credentials as requested
                        echo "Changeme@2025" | docker login ${REGISTRY_URL} -u admin --password-stdin
                    '''
                }
            }
        }

        stage('Push Images to Nexus') {
            steps {
                container('dind') {
                    sh '''
                        docker push ${FULL_IMAGE}:${TAG}
                        docker push ${FULL_IMAGE}:latest
                    '''
                }
            }
        }

        stage('Prepare Kubernetes Namespace') {
            steps {
                container('kubectl') {
                    sh '''
                        kubectl get ns ${NAMESPACE} || kubectl create namespace ${NAMESPACE}
                    '''
                }
            }
        }

        stage('Create Registry Secret') {
            steps {
                container('kubectl') {
                    sh '''
                        if ! kubectl get secret nexus-pull-secret -n ${NAMESPACE}; then
                            kubectl create secret docker-registry nexus-pull-secret \
                              --docker-server=${REGISTRY_URL} \
                              --docker-username="admin" \
                              --docker-password="Changeme@2025" \
                              -n ${NAMESPACE}
                        fi
                        
                        kubectl patch serviceaccount default -n ${NAMESPACE} -p '{"imagePullSecrets":[{"name":"nexus-pull-secret"}]}' || true
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                container('kubectl') {
                    dir('k8s-deployment') {
                        sh '''
                            # Apply Deployment
                            kubectl apply -f smartdine-deployment.yaml -n ${NAMESPACE}
                            
                            # Force update image to new tag
                            kubectl set image deployment/smartdine-deployment smartdine=${FULL_IMAGE}:${TAG} -n ${NAMESPACE}
                            
                            if [ -f namespace.yaml ]; then
                                kubectl apply -f namespace.yaml
                            fi
                        '''
                    }
                }
            }
        }

        stage('Rollout Status') {
            steps {
                container('kubectl') {
                    sh '''
                        kubectl rollout status deployment/smartdine-deployment -n ${NAMESPACE} --timeout=60s
                        kubectl get pods -n ${NAMESPACE} -o wide
                    '''
                }
            }
        }
    }
}