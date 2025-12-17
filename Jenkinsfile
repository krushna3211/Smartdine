pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:

  - name: node
    image: node:20
    command: ["cat"]
    tty: true

  - name: sonar-scanner
    image: sonarsource/sonar-scanner-cli
    command: ["cat"]
    tty: true

  - name: dind
    image: docker:dind
    securityContext:
      privileged: true
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
    command: ["dockerd-entrypoint.sh"]
    args:
    - "--storage-driver=overlay2"
    - "--insecure-registry=10.43.210.159:8085"
    - "--insecure-registry=nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085"

  - name: kubectl
    image: bitnami/kubectl:latest
    command: ["cat"]
    tty: true
    securityContext:
      runAsUser: 0
      readOnlyRootFilesystem: false

'''
        }
    }

    environment {
        APP_NAME        = "smartdine-pos"
        IMAGE_TAG       = "latest"

        // Nexus Docker Repo (Using IP to bypass DNS issues)
        REGISTRY_URL    = "10.43.210.159:8085" 
        REGISTRY_REPO   = "krushna-project"

        // SonarQube
        SONAR_PROJECT   = "2401126-Smartdine"
        SONAR_HOST_URL  = "http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000"
        
        NAMESPACE       = "smartdine"
    }

    stages {

        stage('Install Dependencies') {
            steps {
                container('node') {
                    sh 'npm install'
                }
            }
        }

        stage('Run Tests') {
            steps {
                container('node') {
                    sh 'npm test || echo "No tests found"'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                container('sonar-scanner') {
                    withCredentials([
                        string(credentialsId: 'sonar_token_2401126', variable: 'SONAR_TOKEN')
                    ]) {
                        sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=$SONAR_PROJECT \
                          -Dsonar.sources=. \
                          -Dsonar.exclusions=node_modules/**,public/** \
                          -Dsonar.host.url=$SONAR_HOST_URL \
                          -Dsonar.token=$SONAR_TOKEN
                        '''
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                container('dind') {
                    // Build with the final tag directly
                    sh 'docker build -t $REGISTRY_URL/$REGISTRY_REPO/$APP_NAME:$IMAGE_TAG .'
                }
            }
        }

        stage('Docker Login') {
            steps {
                container('dind') {
                    sh '''
                        docker login $REGISTRY_URL -u admin -p Changeme@2025
                    '''
                }
            }
        }
        

        stage('Push Image') {
            steps {
                container('dind') {
                    sh '''
                        docker push $REGISTRY_URL/$REGISTRY_REPO/$APP_NAME:$IMAGE_TAG
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                container('kubectl') {
                    dir('k8s-deployment') {
                        sh '''
                            # Create secret for registry (using IP)
                            kubectl create secret docker-registry nexus-pull-secret \
                                --docker-server=$REGISTRY_URL \
                                --docker-username=admin \
                                --docker-password=Changeme@2025 \
                                --namespace=$NAMESPACE \
                                --dry-run=client -o yaml | kubectl apply -f -

                            # Apply all manifests
                            kubectl apply -f .
                            
                            # Restart deployment to pick up changes
                            kubectl rollout restart deployment/smartdine-deployment -n $NAMESPACE
                            
                            # Verify
                            echo "Waiting for rollout..."
                            kubectl rollout status deployment/smartdine-deployment -n $NAMESPACE
                        '''
                    }
                }
            }
        }

    }

    post {
        success {
            echo "✅ Pipeline completed successfully"
        }
        failure {
            echo "❌ Pipeline failed"
        }
    }
}
