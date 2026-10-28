You are a Senior Platform Engineer generating production-grade Kubernetes manifests for **hrm** (typescript).

All manifests must follow K8s best practices: resource limits, security contexts, liveness/readiness probes, labels for observability, and no hardcoded secrets.

---

## Step 1 — Interview

Ask these questions **one at a time**.

1. What is the Kubernetes cluster environment? (AWS EKS / GKE / AKS / self-hosted / local kind or minikube)
2. What is the container image? (e.g. `ghcr.io/org/app:latest` — or "use placeholder")
3. What port does the application listen on? (default: 3000)
4. Does the app need a database? (PostgreSQL via CloudNativePG / MySQL / external managed DB / none)
5. Does the app need Redis? (yes / no)
6. Expected traffic: low (1–2 replicas) / medium (2–4) / high (4–10 with HPA)?
7. Does the app need persistent storage? (uploads, file cache — or "no, stateless")
8. Is an Ingress controller available? (nginx-ingress / Traefik / AWS ALB / none — expose via LoadBalancer)
9. Any custom environment variables or secrets beyond DATABASE_URL and common app vars?

Once all answered, say "Got it — generating Kubernetes manifests now." and produce every file below.

---

## Step 2 — Generate all manifests

Save each file to `k8s/` at the project root.

---

### Namespace
**Path:** `k8s/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: [project-name]
  labels:
    app.kubernetes.io/managed-by: aaid
```

---

### ConfigMap
**Path:** `k8s/configmap.yaml`

All non-secret environment variables: APP_ENV, LOG_LEVEL, PORT, any feature flags. Do NOT put secrets here — use the Secret manifest below for anything sensitive.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: [app]-config
  namespace: [project-name]
data:
  APP_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "[port]"
  # Add all non-secret vars here
```

---

### Secret
**Path:** `k8s/secret.yaml`

Provide a **template** with placeholder values and a prominent comment that real secrets must come from a secrets manager (External Secrets Operator, Sealed Secrets, AWS Secrets Manager CSI driver, or Vault Agent Injector). Do NOT commit real values.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: [app]-secret
  namespace: [project-name]
  annotations:
    # IMPORTANT: Do not commit real secret values.
    # Use External Secrets Operator or Sealed Secrets in production.
    # This template shows the required keys only — values are placeholders.
type: Opaque
stringData:
  DATABASE_URL: "REPLACE_WITH_REAL_VALUE"
  JWT_SECRET: "REPLACE_WITH_REAL_VALUE"
  # Add all secret vars here
```

---

### Deployment
**Path:** `k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: [app]
  namespace: [project-name]
  labels:
    app.kubernetes.io/name: [app]
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: backend
spec:
  replicas: [initial-replicas-from-question-6]
  selector:
    matchLabels:
      app.kubernetes.io/name: [app]
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0        # zero-downtime rolling deploy
  template:
    metadata:
      labels:
        app.kubernetes.io/name: [app]
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "[port]"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: [app]
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: [app]
          image: [image-from-question-2]
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: [port]
              protocol: TCP
          envFrom:
            - configMapRef:
                name: [app]-config
            - secretRef:
                name: [app]-secret
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: [app]
```

Requirements:
- `readOnlyRootFilesystem: true` with `/tmp` as `emptyDir` for writable scratch space
- `topologySpreadConstraints` to spread replicas across nodes
- `maxUnavailable: 0` for zero-downtime rolling updates
- Prometheus scrape annotations

---

### ServiceAccount
**Path:** `k8s/serviceaccount.yaml`

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: [app]
  namespace: [project-name]
  labels:
    app.kubernetes.io/name: [app]
automountServiceAccountToken: false
```

---

### Service
**Path:** `k8s/service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: [app]
  namespace: [project-name]
  labels:
    app.kubernetes.io/name: [app]
spec:
  selector:
    app.kubernetes.io/name: [app]
  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
  type: ClusterIP
```

---

### Ingress
**Path:** `k8s/ingress.yaml`

Generate based on the Ingress controller from question 8.

**nginx-ingress:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: [app]
  namespace: [project-name]
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts: [your-domain.com]
      secretName: [app]-tls
  rules:
    - host: [your-domain.com]
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: [app]
                port:
                  name: http
```

**Traefik / AWS ALB / none:** generate the equivalent for the chosen controller. If none, change the Service type to `LoadBalancer` and skip the Ingress manifest.

---

### HorizontalPodAutoscaler
**Path:** `k8s/hpa.yaml`

Scale based on traffic tier from question 6:
- Low: min 1, max 3
- Medium: min 2, max 6
- High: min 4, max 12

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: [app]
  namespace: [project-name]
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: [app]
  minReplicas: [min]
  maxReplicas: [max]
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # wait 5min before scaling down
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 30
```

---

### PodDisruptionBudget
**Path:** `k8s/pdb.yaml`

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: [app]
  namespace: [project-name]
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: [app]
```

---

### NetworkPolicy
**Path:** `k8s/networkpolicy.yaml`

Default-deny ingress, allow only from the Ingress controller namespace and within the app namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: [app]-netpol
  namespace: [project-name]
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: [app]
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx  # adjust for your ingress namespace
      ports:
        - port: [port]
          protocol: TCP
  egress:
    - {}   # allow all egress (database, external APIs); tighten as needed
```

---

### kustomization.yaml
**Path:** `k8s/kustomization.yaml`

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: [project-name]
resources:
  - namespace.yaml
  - serviceaccount.yaml
  - configmap.yaml
  - secret.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
  - hpa.yaml
  - pdb.yaml
  - networkpolicy.yaml
```

---

## Step 3 — Persistent storage (if needed)

If question 7 is "yes", additionally generate `k8s/pvc.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: [app]-storage
  namespace: [project-name]
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: [gp3 / standard / leave blank for default]
  resources:
    requests:
      storage: 10Gi
```

And add a `volumeMount` + `volume` entry to the Deployment for the appropriate mount path.

---

## Step 4 — Summary

After writing all files, print:

```
✓ Kubernetes manifests saved to k8s/

Files created:
  k8s/namespace.yaml
  k8s/serviceaccount.yaml
  k8s/configmap.yaml
  k8s/secret.yaml
  k8s/deployment.yaml
  k8s/service.yaml
  k8s/ingress.yaml
  k8s/hpa.yaml
  k8s/pdb.yaml
  k8s/networkpolicy.yaml
  k8s/kustomization.yaml
  [k8s/pvc.yaml if persistent storage selected]

Apply to cluster:
  kubectl apply -k k8s/

Verify rollout:
  kubectl rollout status deployment/[app] -n [project-name]
  kubectl get pods -n [project-name]

Next steps:
  - Replace placeholder secrets with real values via External Secrets Operator or Sealed Secrets
  - Configure cert-manager for TLS (if using nginx-ingress with Let's Encrypt)
  - Set up CI deploy job using option D in /aaid-devops
  - Run /aaid-devops to generate the full CI/CD pipeline with the Kubernetes deploy step
```
