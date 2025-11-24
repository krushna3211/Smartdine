pipeline {
    agent {
        kubernetes {
            // This YAML setup is perfect for your college, do not change it.
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
    
    stage('Build Docker Image') {
            steps {
                container('dind') {
                    sh '''
                        # 1. Wait loop: Keep checking until Docker is alive
                        echo "Waiting for Docker daemon..."
                        while ! docker info > /dev/null 2>&1; do
                            echo "Docker not ready yet..."
                            sleep 2
                        done
                        echo "Docker is READY!"

                        # 2. Now it is safe to build
                        docker build -t smartdine-pos:latest .
                        docker image ls
                    '''
                }
            }
        }

        stage('Run Tests in Docker') {
            steps {
                container('dind') {
                    sh '''
                        # Run npm test inside the container
                        docker run --rm smartdine-pos:latest npm test
                    '''
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                container('sonar-scanner') {
                    // CHECK THIS: Use 'sonar-token' or create a credential with your ID like 'sonar-token-YOURID'
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        sh '''
                            sonar-scanner \
                                -Dsonar.projectKey=Krushna-project \
                                -Dsonar.host.url=http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000 \
                                -Dsonar.login=sqp_7ab8155024bcd0bf186d45ee01e0f0cdf0db062e \
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
                    sh 'docker --version'
                    sh 'sleep 5'
                    // Note: In a real job, don't hardcode password. For college, it might be required.
                    sh 'docker login nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085 -u admin -p Changeme@2025'
                }
            }
        }

        stage('Build - Tag - Push') {
            steps {
                container('dind') {
                    // CHECK THIS: Replace 'krushna-project' with your folder name in Nexus (usually your name or ID)
                    sh 'docker tag smartdine-pos:latest nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085/krushna-project/smartdine-pos:v1'
                    sh 'docker push nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085/krushna-project/smartdine-pos:v1'
                }
            }
        }

        stage('Deploy Application') {
            steps {
                container('kubectl') {
                    script {
                        // We need to create the deployment file dynamically or have it in a folder
                        // This command applies the deployment.
                        // Make sure you create the folder 'k8s-deployment' and file 'smartdine.yaml' first!
                        dir('k8s-deployment') {
                            sh '''
                                kubectl apply -f smartdine-deployment.yaml
                                
                                # CHECK THIS: Replace 'YOUR_NAMESPACE' with your actual Kubernetes namespace (e.g. 2401199)
                                kubectl rollout status deployment/smartdine-deployment -n YOUR_NAMESPACE
                            '''
                        }
                    }
                }
            }
        }
    }
}