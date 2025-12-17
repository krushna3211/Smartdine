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
        APP_NAME        = "smartdine-pos"
        IMAGE_TAG       = "${BUILD_NUMBER}"

        REGISTRY_URL    = "nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085"
        REGISTRY_REPO   = "krushna-project"

        SONAR_PROJECT   = "2401126-Smartdine"
        SONAR_HOST_URL  = "http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000"

        NAMESPACE       = "smartdine"
    }

    stages {

        stage('Build Docker Image') {
            steps {
                container('dind') {
                    sh '''
                        sleep 15
                        docker build -t $APP_NAME:$IMAGE_TAG .
                        docker images
                    '''
                }
            }
        }

        stage('Run Tests in Docker') {
            steps {
                container('dind') {
                    sh '''
                        echo "Running tests..."
                        # docker run --rm $APP_NAME:$IMAGE_TAG npm test
                    '''
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
                              -Dsonar.host.url=$SONAR_HOST_URL \
                              -Dsonar.login=$SONAR_TOKEN \
                              -Dsonar.sources=. \
                              -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/build/**
                        '''
                    }
                }
            }
        }

        stage('Login to Docker Registry') {
            steps {
                container('dind') {
                    sh '''
                        docker login $REGISTRY_URL -u admin -p Changeme@2025
                    '''
                }
            }
        }

        stage('Build - Tag - Push Image') {
            steps {
                container('dind') {
                    sh '''
                        docker tag $APP_NAME:$IMAGE_TAG \
                          $REGISTRY_URL/$REGISTRY_REPO/$APP_NAME:$IMAGE_TAG

                        docker tag $APP_NAME:$IMAGE_TAG \
                          $REGISTRY_URL/$REGISTRY_REPO/$APP_NAME:latest

                        docker push $REGISTRY_URL/$REGISTRY_REPO/$APP_NAME:$IMAGE_TAG
                        docker push $REGISTRY_URL/$REGISTRY_REPO/$APP_NAME:latest

                        docker images
                    '''
                }
            }
        }

        stage('Deploy Application') {
            steps {
                container('kubectl') {
                    dir('k8s-deployment') {
                        sh '''
                            # 1. Resolve the Service ClusterIP
                            REGISTRY_IP=$(kubectl get svc nexus-service-for-docker-hosted-registry -n nexus -o jsonpath='{.spec.clusterIP}')
                            echo "Resolved Registry IP: $REGISTRY_IP"

                            # 2. Create secret using the IP address (Bypass DNS)
                            kubectl create secret docker-registry nexus-pull-secret \
                                --docker-server=${REGISTRY_IP}:8085 \
                                --docker-username=admin \
                                --docker-password=Changeme@2025 \
                                --namespace=smartdine \
                                --dry-run=client -o yaml | kubectl apply -f -

                            # 3. Replace Hostname with IP in Deployment YAML
                            sed -i "s/nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local/$REGISTRY_IP/g" smartdine-deployment.yaml

                            # 4. Apply
                            kubectl apply -f .
                            kubectl rollout restart deployment/smartdine-deployment -n smartdine
                        '''
                    }
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                container('kubectl') {
                    sh '''
                        sleep 10
                        echo "Checking Pod Status:"
                        kubectl get pods -n smartdine
                        
                        echo "Checking Deployment Status:"
                        kubectl describe deployment smartdine-deployment -n smartdine || true

                        echo "Checking Pods Details (Events):"
                        kubectl describe pods -l app=smartdine -n smartdine
                        
                        echo "Fetching Pod Logs:"
                        kubectl logs -l app=smartdine -n smartdine --tail=50 || echo "No logs found"
                    '''
                }
            }
        }
    }
}
