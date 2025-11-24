pipeline {
    agent any

    environment {
        // Secrets for your App Database
        MONGO_URI = credentials('mongo-uri-secret') 
        JWT_SECRET = credentials('jwt-secret')
        
        // SonarQube Configuration
        // NOTE: Change 'Krushna-project' to match your actual project key on the server!
        SONAR_PROJECT_KEY = 'Krushna-project' 
    }

    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                // 'SonarQube' is the name of the server configured in Jenkins System settings.
                // If your college named it something else (like 'Sonar-Server'), change it here.
                withSonarQubeEnv('SonarQube') { 
                    
                    // The scanner automatically picks up the URL and Token from the environment above.
                    // We only need to provide project specific details.
                    sh """
                        sonar-scanner \
                        -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                        -Dsonar.sources=. \
                        -Dsonar.exclusions=node_modules/**,coverage/** \
                        -Dsonar.css.exclusions=**/*.css
                    """
                }
            }
        }

        stage('Quality Gate') {
            steps {
                // This pauses the pipeline until SonarQube gives a Pass/Fail result
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Quality Gate passed! Building Docker image...'
                sh 'docker build -t smartdine-pos .'
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying container...'
                sh 'docker stop smartdine-container || true'
                sh 'docker rm smartdine-container || true'
                
                sh """
                    docker run -d \
                    -p 5000:5000 \
                    --name smartdine-container \
                    -e MONGO_URI=${MONGO_URI} \
                    -e JWT_SECRET=${JWT_SECRET} \
                    smartdine-pos
                """
            }
        }
    }
}