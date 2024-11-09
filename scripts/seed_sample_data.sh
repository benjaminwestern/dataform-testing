#!/bin/bash

# Default file path
FILE_NAME="./definitions/5_extras/sample_data.ndjson" 

# Check if a bucket name is provided as an argument.  Exit with an error if not.
if [ -z "$1" ]; then
  echo "Usage: $0 <bucket_name>"
  exit 1
fi

BUCKET_NAME="$1"


# Check if the gsutil command exists. Exit if it doesn't.
if ! command -v gsutil &> /dev/null
then
    echo "gsutil command not found. Please install the Google Cloud SDK."
    exit 1
fi

# Check if the file exists.  Exit if it doesn't.
if [ ! -f "$FILE_NAME" ]; then
  echo "Error: File '$FILE_NAME' not found."
  exit 1
fi

# Upload the file to the GCS bucket, setting the correct content type.
echo "Uploading file '$FILE_NAME' to gs://$BUCKET_NAME/$(basename "$FILE_NAME")"
gsutil cp "$FILE_NAME" "gs://$BUCKET_NAME/$(basename "$FILE_NAME")"


# Check the exit code of the gsutil command and print success/error message
if [ $? -eq 0 ]; then 
  echo "File '$FILE_NAME' uploaded successfully to gs://$BUCKET_NAME/$(basename "$FILE_NAME")"
else
  echo "Error uploading file."
  exit 1
fi