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

  parameters {
    string(name: 'TARGET_NAMESPACE', defaultValue: '2401106', description: 'Desired kubernetes namespace (will be sanitized)')
    string(name: 'NEXUS_REGISTRY', defaultValue: 'nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085', description: 'Docker registry host:port')
    string(name: 'REPOSITORY', defaultValue: 'my-repository', description: 'Repository inside nexus (eg my-repository)')
  }

  stages {

    stage('Build Docker Images') {
      steps {
        container('dind') {
          sh '''
            sleep 10
            docker build -t server:latest ./server
            docker build -t client:latest ./client
          '''
        }
      }
    }

    stage('SonarQube Scan') {
      steps {
        container('sonar-scanner') {
          withCredentials([string(credentialsId: 'sonar-token-2401106', variable: 'SONAR_TOKEN')]) {
            sh '''
              sonar-scanner \
                -Dsonar.projectKey=2401106_client-server-app \
                -Dsonar.host.url=http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000 \
                -Dsonar.login=$SONAR_TOKEN
            '''
          }
        }
      }
    }

    stage('Login to Nexus Registry (Jenkins)') {
      steps {
        container('dind') {
          withCredentials([usernamePassword(credentialsId: 'nexus-docker-creds', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
            sh '''
              echo "$NEXUS_PASS" | docker login ${NEXUS_REGISTRY} -u "$NEXUS_USER" --password-stdin
            '''
          }
        }
      }
    }

    stage('Tag + Push Images') {
      steps {
        container('dind') {
          sh '''
            docker tag server:latest ${NEXUS_REGISTRY}/${REPOSITORY}/server:latest
            docker tag client:latest ${NEXUS_REGISTRY}/${REPOSITORY}/client:latest

            docker push ${NEXUS_REGISTRY}/${REPOSITORY}/server:latest
            docker push ${NEXUS_REGISTRY}/${REPOSITORY}/client:latest
          '''
        }
      }
    }

    stage('Prepare Namespace & Secrets') {
      steps {
        container('kubectl') {
          // gather SANITIZED_NAMESPACE inside shell so we can use the same value consistently
          withCredentials([usernamePassword(credentialsId: 'nexus-docker-creds', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS'),
                           string(credentialsId: 'mongo-uri-2401106', variable: 'MONGO_URI'),
                           string(credentialsId: 'jwt-secret-2401106', variable: 'JWT_SECRET'),
                           string(credentialsId: 'gmail-user-2401106', variable: 'GMAIL_USER'),
                           string(credentialsId: 'gmail-pass-2401106', variable: 'GMAIL_PASS')]) {
            sh '''
              set -euo pipefail

              # sanitize namespace (RFC1123: lower-case alnum and '-', must start/end with alnum)
              RAW_NS="${TARGET_NAMESPACE}"
              SANITIZED_NS=$(echo "${RAW_NS}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/^-*//; s/-*$//')
              if [ -z "${SANITIZED_NS}" ]; then
                echo "ERROR: namespace after sanitization is empty (raw='${RAW_NS}')."; exit 1
              fi
              echo "Using namespace: ${SANITIZED_NS}"
              export SANITIZED_NS

              # apply namespace.yaml if present (may create with labels/annotations)
              if [ -f k8s-deployment/namespace.yaml ]; then
                echo "Applying k8s-deployment/namespace.yaml"
                kubectl apply -f k8s-deployment/namespace.yaml || true
              fi

              # ensure namespace exists
              if ! kubectl get namespace "${SANITIZED_NS}" >/dev/null 2>&1; then
                echo "Creating namespace ${SANITIZED_NS}"
                kubectl create namespace "${SANITIZED_NS}"
              else
                echo "Namespace ${SANITIZED_NS} already exists"
              fi

              # create imagePullSecret (docker registry) in the namespace
              echo "Creating/updating imagePullSecret in ${SANITIZED_NS}"
              kubectl create secret docker-registry nexus-pull-secret \
                --docker-server=${NEXUS_REGISTRY} \
                --docker-username="${NEXUS_USER}" \
                --docker-password="${NEXUS_PASS}" \
                -n "${SANITIZED_NS}" --dry-run=client -o yaml | kubectl apply -f -

              # patch default serviceaccount to use the pull secret so pods can pull images automatically
              kubectl patch serviceaccount default -n "${SANITIZED_NS}" \
                -p '{"imagePullSecrets":[{"name":"nexus-pull-secret"}]}' || true

              # create application secrets if not present
              kubectl create secret generic server-secret -n "${SANITIZED_NS}" \
                --from-literal=MONGO_URI="$MONGO_URI" \
                --from-literal=JWT_SECRET="$JWT_SECRET" \
                --from-literal=GMAIL_USER="$GMAIL_USER" \
                --from-literal=GMAIL_PASS="$GMAIL_PASS" \
                --dry-run=client -o yaml | kubectl apply -f -
            '''
          }
        }
      }
    }

    stage('Preflight diagnostics (DNS / Registry reachability)') {
      steps {
        container('kubectl') {
          sh '''
            set -euo pipefail
            # reuse sanitized namespace from prior step if available; otherwise compute
            RAW_NS="${TARGET_NAMESPACE}"
            SANITIZED_NS=$(echo "${RAW_NS}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/^-*//; s/-*$//')
            echo "Diagnostics for namespace=${SANITIZED_NS}, registry=${NEXUS_REGISTRY}"

            echo "== kubernetes svc / endpoints for registry (if any) =="
            kubectl get svc --all-namespaces | grep -i "$(echo ${NEXUS_REGISTRY} | sed 's/:.*//')" || true
            kubectl get endpoints --all-namespaces | grep -i "$(echo ${NEXUS_REGISTRY} | sed 's/:.*//')" || true

            echo "== DNS test from transient pod =="
            kubectl run dns-test --restart=Never --rm -i --image=busybox -- nslookup "$(echo ${NEXUS_REGISTRY} | sed 's/:.*//')" || true

            echo "== HTTP(s) test to registry from transient pod =="
            # try http then https
            kubectl run curl-test --restart=Never --rm -i --image=radial/busyboxplus:curl -- sh -c "echo trying http...; curl -I http://${NEXUS_REGISTRY} || echo http-failed; echo trying https...; curl -I https://${NEXUS_REGISTRY} || echo https-failed" || true

            echo "== kube-dns/coredns status (kube-system) =="
            kubectl get pods -n kube-system -l k8s-app=kube-dns || kubectl get pods -n kube-system -l k8s-app=coredns || true
            kubectl -n kube-system logs -l k8s-app=kube-dns --tail=50 || kubectl -n kube-system logs -l k8s-app=coredns --tail=50 || true

            echo "== End diagnostics =="
          '''
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        container('kubectl') {
          dir('k8s-deployment') {
            sh '''
              set -euo pipefail

              RAW_NS="${TARGET_NAMESPACE}"
              SANITIZED_NS=$(echo "${RAW_NS}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/^-*//; s/-*$//')

              echo "Deploying to namespace ${SANITIZED_NS}"

              # apply manifests (ensure they reference correct namespace or are applied with -n)
              kubectl apply -f namespace.yaml || true

              # Prefer applying per-file to keep clarity like your original pipeline
              kubectl apply -f server-deployment.yaml -n "${SANITIZED_NS}"
              kubectl apply -f server-service.yaml -n "${SANITIZED_NS}"
              kubectl apply -f client-deployment.yaml -n "${SANITIZED_NS}"
              kubectl apply -f client-service.yaml -n "${SANITIZED_NS}"

              # if your manifests don't set image placeholders, we set the image explicitly
              kubectl set image deployment/server server=${NEXUS_REGISTRY}/${REPOSITORY}/server:latest -n "${SANITIZED_NS}" || true
              kubectl set image deployment/client client=${NEXUS_REGISTRY}/${REPOSITORY}/client:latest -n "${SANITIZED_NS}" || true

              echo "Waiting for rollout: server"
              if ! kubectl rollout status deployment/server -n "${SANITIZED_NS}" --timeout=120s; then
                echo "Rollout of server failed or timed out — gathering debug info"
                kubectl get pods -n "${SANITIZED_NS}" -o wide || true
                kubectl describe pods -n "${SANITIZED_NS}" || true
                kubectl get events -n "${SANITIZED_NS}" --sort-by=.metadata.creationTimestamp || true
                exit 1
              fi

              echo "Waiting for rollout: client"
              if ! kubectl rollout status deployment/client -n "${SANITIZED_NS}" --timeout=120s; then
                echo "Rollout of client failed or timed out — gathering debug info"
                kubectl get pods -n "${SANITIZED_NS}" -o wide || true
                kubectl describe pods -n "${SANITIZED_NS}" || true
                kubectl get events -n "${SANITIZED_NS}" --sort-by=.metadata.creationTimestamp || true
                exit 1
              fi

              echo "Deploy successful"
            '''
          }
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'k8s-deployment/**', allowEmptyArchive: true
    }
    failure {
      echo "Pipeline failed — check the logs above for diagnostic output (DNS / curl / describe pods)"
    }
  }
}
