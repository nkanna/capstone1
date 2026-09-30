#!/usr/bin/env bash
# teardown.sh — remove AWS resources created by the Unit 1 Capstone deploy
# steps (README.md → Step 5: Deploy to S3).
#
# This is deliberately scoped to exactly what those instructions create —
# NOT a blanket "delete everything in my AWS account" script. In a shared or
# templated sandbox account, a blind sweep risks deleting baseline
# scaffolding or other students' resources that have nothing to do with this
# capstone. If you created other AWS resources for other purposes, this
# script will not find or touch them.
#
# What it removes:
#   - The S3 bucket you deployed your React build to (and everything in it)
#   - (only with --lambda) The Lambda function + Function URL + IAM role
#     from the "If Your Sandbox Blocks Backend Hosting" section, using the
#     exact names those instructions use. Skip --lambda if you never went
#     down that path.
#
# Usage:
#   ./teardown.sh <s3-bucket-name>              # tear down just the bucket
#   ./teardown.sh <s3-bucket-name> --lambda      # also tear down the Lambda bits
#   ./teardown.sh <s3-bucket-name> --lambda --yes  # skip the confirmation prompt

set -euo pipefail

BUCKET=""
TEAR_DOWN_LAMBDA=false
SKIP_CONFIRM=false

LAMBDA_FN="unit1-capstone-ai-stream"
LAMBDA_ROLE="unit1-capstone-ai-lambda-role"
LAMBDA_ROLE_POLICY="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"

usage() {
  echo "Usage: $0 <s3-bucket-name> [--lambda] [--yes]" >&2
  echo "" >&2
  echo "  <s3-bucket-name>  Required. The bucket you deployed your build to." >&2
  echo "  --lambda          Also remove the Lambda function/role from the" >&2
  echo "                    'If Your Sandbox Blocks Backend Hosting' section." >&2
  echo "  --yes             Skip the confirmation prompt." >&2
}

for arg in "$@"; do
  case "$arg" in
    --lambda) TEAR_DOWN_LAMBDA=true ;;
    --yes) SKIP_CONFIRM=true ;;
    -h|--help) usage; exit 0 ;;
    -*)
      echo "Unknown flag: $arg" >&2
      usage
      exit 1
      ;;
    *) BUCKET="$arg" ;;
  esac
done

if [[ -z "$BUCKET" ]]; then
  read -r -p "S3 bucket name to tear down: " BUCKET
fi

if [[ -z "$BUCKET" ]]; then
  echo "No bucket name given — nothing to do." >&2
  usage
  exit 1
fi

echo "This will delete:"
echo "  - S3 bucket: $BUCKET (and everything in it)"
if $TEAR_DOWN_LAMBDA; then
  echo "  - Lambda function + Function URL: $LAMBDA_FN"
  echo "  - IAM role: $LAMBDA_ROLE"
fi
echo ""
echo "This does NOT touch any other AWS resources in your account."
echo ""

if ! $SKIP_CONFIRM; then
  read -r -p "Continue? [y/N] " reply
  case "$reply" in
    [yY] | [yY][eE][sS]) ;;
    *)
      echo "Aborted — nothing was deleted."
      exit 0
      ;;
  esac
fi

# --- S3 bucket ---
echo ""
echo "== S3 =="
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "Emptying $BUCKET..."
  aws s3 rm "s3://$BUCKET" --recursive
  echo "Deleting bucket $BUCKET..."
  aws s3api delete-bucket --bucket "$BUCKET"
  echo "Done."
else
  echo "Bucket '$BUCKET' not found (already deleted, wrong name, or wrong region) — skipping."
fi

# --- Lambda + IAM role (only if requested) ---
if $TEAR_DOWN_LAMBDA; then
  echo ""
  echo "== Lambda =="
  if aws lambda get-function --function-name "$LAMBDA_FN" >/dev/null 2>&1; then
    echo "Deleting Function URL config for $LAMBDA_FN..."
    aws lambda delete-function-url-config --function-name "$LAMBDA_FN" 2>/dev/null || true
    echo "Deleting Lambda function $LAMBDA_FN..."
    aws lambda delete-function --function-name "$LAMBDA_FN"
    echo "Done."
  else
    echo "Lambda function '$LAMBDA_FN' not found — skipping."
  fi

  echo ""
  echo "== IAM =="
  if aws iam get-role --role-name "$LAMBDA_ROLE" >/dev/null 2>&1; then
    echo "Detaching AWSLambdaBasicExecutionRole from $LAMBDA_ROLE..."
    # Only detaching the one policy our own setup instructions ever attach —
    # not enumerating attached policies, since listing them requires an IAM
    # introspection permission some sandboxes explicitly deny.
    aws iam detach-role-policy --role-name "$LAMBDA_ROLE" --policy-arn "$LAMBDA_ROLE_POLICY" 2>/dev/null || true
    echo "Deleting role $LAMBDA_ROLE..."
    aws iam delete-role --role-name "$LAMBDA_ROLE"
    echo "Done."
  else
    echo "IAM role '$LAMBDA_ROLE' not found — skipping."
  fi
fi

echo ""
echo "== Verify =="
echo "Remaining resources matching this capstone's naming (should be empty):"
aws s3api list-buckets --query "Buckets[?contains(Name, 'spoonful') || contains(Name, 'capstone')].Name" --output text
if $TEAR_DOWN_LAMBDA; then
  aws lambda list-functions --query "Functions[?contains(FunctionName, 'capstone')].FunctionName" --output text
fi

echo ""
echo "Teardown complete."
