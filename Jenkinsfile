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
      # This flag fixes the HTTP/HTTPS error
      - "--insecure-registry=10.43.21.172:8085"
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
        // --- YOUR CONFIGURATION ---
        REGISTRY_IP = "10.43.21.172:8085"
        PROJECT_NAME = "krushna-project" 
        APP_NAME = "smartdine-pos"
        
        // Full image URL
        FULL_IMAGE = "${REGISTRY_IP}/${PROJECT_NAME}/${APP_NAME}"
        
        TAG = "${env.BUILD_NUMBER}"
        NAMESPACE = "smartdine"
        
        // Sonar Settings
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
                        
                        # Tag latest as well
                        docker tag ${FULL_IMAGE}:${TAG} ${FULL_IMAGE}:latest
                        
                        docker images
                    '''
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                container('sonar-scanner') {
                    // We still use the sonar-auth-new credential we created earlier
                    withCredentials([string(credentialsId: 'sonar-auth-new', variable: 'SONAR_TOKEN')]) {
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
                    // HARDCODED CREDENTIALS (Like your friend's file)
                    sh '''
                        echo "Changeme@2025" | docker login ${REGISTRY_IP} -u admin --password-stdin
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
                    // HARDCODED CREDENTIALS for the Kubernetes Secret
                    sh '''
                        # Only create secret if it doesn't exist
                        if ! kubectl get secret nexus-pull-secret -n ${NAMESPACE}; then
                            kubectl create secret docker-registry nexus-pull-secret \
                              --docker-server=${REGISTRY_IP} \
                              --docker-username="admin" \
                              --docker-password="Changeme@2025" \
                              -n ${NAMESPACE}
                        fi
                        
                        # Patch default account to use it
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
                            # Apply your deployment file
                            kubectl apply -f smartdine-deployment.yaml -n ${NAMESPACE}
                            
                            # Force update the image to the specific build tag we just pushed
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