#!/bin/bash
# Step 1: List all policies and save their ARNs to a file, one per line
echo "Listing all policy ARNs..."
aws iam list-policies --query 'Policies[*].Arn' --output text | tr '\t' '\n' > policy_arns.txt
if [ $? -ne 0 ]; then
  echo "Error listing policies"
  exit 1
fi
# Step 2: Create a directory to store policy documents if it doesn't exist
mkdir -p policies
# Step 3: Retrieve each policy document
while IFS= read -r arn; do
  if [ -n "$arn" ]; then
    policy_name=$(basename "$arn")
    echo "ARN Policy: $arn"
    # Retrieve the default version of the policy
    echo "Fetching default version for policy: $arn"
    default_version=$(aws iam get-policy --policy-arn "$arn" --query 'Policy.DefaultVersionId' --output text)
    if [ $? -ne 0 ] || [ -z "$default_version" ]; then
      echo "Error retrieving default version for policy: $arn" >&2
      continue
    fi
    echo "Default version for $policy_name is $default_version"
    # Retrieve the policy version document
    echo "Fetching policy JSON file from ARN: $arn"
    policy_json=$(aws iam get-policy-version --policy-arn "$arn" --version-id "$default_version" --query 'PolicyVersion.Document' --output json)
    if [ $? -ne 0 ]; then
      echo "Error retrieving policy version document for policy: $arn with version: $default_version" >&2
      continue
    fi
    # Print JSON output
    echo "Policy JSON for $arn:"
    echo "$policy_json"
    # Save the policy JSON
    echo "$policy_json" > "policies/${policy_name}.json"
    echo "Saved policy document for $policy_name"
  else
    echo "Empty ARN encountered, skipping..." >&2
  fi
done < policy_arns.txt
# Step 4: Create a zip file containing all policy documents
echo "Creating zip file of all policy documents..."
zip -r policies.zip policies
# Optional: Cleanup
echo "Cleaning up..."
rm policy_arns.txt
echo "Done."