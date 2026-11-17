# AWS 배포 설정

한 번만 하면 되는 작업입니다. 그 뒤로는 `main`에 push하면 GitHub Actions가 배포합니다.

```
방문자 ─ CloudFront ─┬─ /*      → CloudFront 함수(라우터) → S3 (dist/)
                      └─ /api/*  → CloudFront 함수(헤더) → Lambda 함수 URL → DynamoDB
```

- 정적 페이지: 비공개 S3 버킷. CloudFront만 OAC로 읽습니다.
- 페이지 주소: CloudFront 함수가 `/about` → `/about/index.html`로 바꾸고, 없는 주소에는 `404.html` 본문으로 404를 돌려줍니다. 페이지 목록은 배포 때마다 다시 넣습니다. CloudFront의 사용자 지정 오류 응답은 배포 전체에 걸려서 댓글 API의 403·404 응답까지 덮어쓰기 때문에 쓰지 않습니다.
- 댓글 API: Lambda(Node.js 22, arm64)와 DynamoDB 표 두 개(댓글, 요청 제한)입니다. 함수 URL은 공개 주소지만 CloudFront가 붙이는 `x-origin-verify` 비밀 값이 없으면 403을 돌려줍니다.
- 배포 권한: GitHub OIDC 역할입니다. 이 저장소의 `main`만 쓸 수 있고, 버킷 업로드·Lambda 코드 교체·라우터 갱신·캐시 무효화만 허용합니다.

## 1. 인증서 (도메인을 쓸 때)

ACM 콘솔에서 **리전을 us-east-1(버지니아 북부)로 두고** `hyeonjaeoh.com`(필요하면 `www.hyeonjaeoh.com`도)의 공인 인증서를 DNS 검증으로 요청합니다. 안내된 CNAME을 도메인 DNS에 넣고 상태가 "발급됨"이 되면 ARN을 복사해 둡니다. CloudFront는 us-east-1 인증서만 받습니다.

도메인 없이 `*.cloudfront.net` 주소로 먼저 확인하려면 이 단계를 건너뛰고 아래에서 `DomainNames`·`CertificateArn`을 빼면 됩니다.

## 2. 스택 만들기

관리자 권한이 있는 AWS CLI로 실행합니다. 리전은 서울(ap-northeast-2)을 예로 들었습니다.

```bash
aws cloudformation deploy --region ap-northeast-2 --stack-name portfolio --template-file infra/aws.yml --capabilities CAPABILITY_IAM --parameter-overrides OriginSecret=$(openssl rand -hex 32) DomainNames=hyeonjaeoh.com CertificateArn=arn:aws:acm:us-east-1:<계정>:certificate/<ID>
```

- 계정에 GitHub OIDC 공급자(`token.actions.githubusercontent.com`)가 이미 있으면 `CreateGitHubOidcProvider=false`를 더합니다.
- 나중에 템플릿을 고쳐 다시 배포할 때는 `OriginSecret=...`을 빼도 됩니다. 기존 값이 유지됩니다.
- 스택을 다시 배포하면 Lambda 코드와 라우터 함수가 템플릿의 자리표시 코드로 돌아갈 수 있습니다. 그럴 때는 Actions에서 `Deploy to AWS`를 한 번 수동 실행(`Run workflow`)하세요.

출력값을 확인합니다.

```bash
aws cloudformation describe-stacks --region ap-northeast-2 --stack-name portfolio --query "Stacks[0].Outputs" --output table
```

## 3. GitHub 저장소 변수

저장소 → Settings → Secrets and variables → Actions → **Variables**에 넣습니다. 전부 비밀 값이 아니라서 Secrets가 아닌 Variables에 둡니다.

| 변수 | 값 |
|---|---|
| `AWS_REGION` | `ap-northeast-2` (스택 리전) |
| `AWS_ROLE_ARN` | 출력 `DeployRoleArn` |
| `AWS_SITE_BUCKET` | 출력 `SiteBucket` |
| `AWS_DISTRIBUTION_ID` | 출력 `DistributionId` |
| `AWS_API_FUNCTION` | 출력 `ApiFunctionName` |
| `AWS_ROUTER_FUNCTION` | 출력 `RouterFunctionName` |

`AWS_ROLE_ARN`이 비어 있는 동안 워크플로는 배포 작업을 건너뜁니다. 넣은 뒤 Actions → `Deploy to AWS` → `Run workflow`로 첫 배포를 하고 출력 `DistributionDomain`(`xxxx.cloudfront.net`)에서 사이트와 댓글을 확인합니다.

## 4. 도메인 전환

`hyeonjaeoh.com`의 DNS는 Cloudflare에 있습니다(네임서버 `*.ns.cloudflare.com`). Cloudflare 대시보드 → 도메인 → **DNS → Records**에서:

| 유형 | 이름 | 대상 | 프록시 상태 |
|---|---|---|---|
| CNAME | `@` | 출력 `DistributionDomain` (`dxxxx.cloudfront.net`) | **DNS 전용(회색 구름)** |
| CNAME | `www` (쓸 때만) | 같은 값 | **DNS 전용(회색 구름)** |

- 루트(`@`)에 CNAME을 넣어도 Cloudflare가 CNAME 평탄화로 처리합니다.
- 같은 이름에 이미 있는 A/AAAA/CNAME(지금 OpenAI Sites를 가리키는 레코드)은 지우거나 바꿔야 새 레코드가 들어갑니다. 이 순간이 실제 전환입니다.
- **주황 구름(프록시)을 켜지 마세요.** Cloudflare가 CloudFront 앞에 한 번 더 서면 CDN이 이중이 되고, 캐시·인증서·방문자 IP 처리가 꼬입니다.
- 1단계 ACM 검증용 CNAME(`_xxxx.hyeonjaeoh.com` → `_yyyy.acm-validations.aws`)도 같은 화면에 **DNS 전용**으로 넣습니다. 인증서 갱신에 계속 쓰이니 지우지 않습니다.
- `www`를 쓰려면 인증서와 스택의 `DomainNames`에 `www.hyeonjaeoh.com`도 넣어야 합니다.

## 5. 이전 배포 정리 (전환 확인 뒤)

- 기존 Cloudflare D1에 있던 댓글은 자동으로 옮겨지지 않습니다. 남길 댓글이 있으면 내보내서 `CommentsTable`에 넣어야 합니다(`sort` = `<created_at 13자리>#<id>`).
- OpenAI Sites 연결(`.openai/hosting.json`)을 끊고, 원하면 `dist/`를 git 추적에서 빼서 `.gitignore`에 넣습니다. 지금은 Actions가 매번 새로 빌드하므로 커밋된 `dist/`는 쓰이지 않습니다.

## 비용 감

트래픽이 적은 개인 사이트라면 S3·CloudFront·Lambda·DynamoDB(온디맨드) 모두 프리 티어나 월 몇백 원 수준입니다. DynamoDB 시점 복구(PITR)는 저장량에 비례해 과금되는데, 댓글 표 크기로는 미미합니다. 정확한 값은 AWS 요금표로 확인하세요.
