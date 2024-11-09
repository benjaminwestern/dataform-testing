# Dataform Testing Ground

## Description
This repository provides a testing ground for Dataform features, including CLI, Core, BigQuery integration, and SQLFluff integration. It requires a Google Cloud project with several APIs enabled (BigQuery, Dataform, etc.) and access to the public Stack Overflow dataset. The development environment setup involves Python, Node.js, the Google Cloud SDK, and the Dataform CLI. Detailed instructions for authentication, project setup, and compilation are included. The README also provides a comprehensive list of references to Dataform and Google Cloud documentation.

## Table of Contents
- [Dataform Testing Ground](#dataform-testing-ground)
  - [Description](#description)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
    - [Google Cloud](#google-cloud)
    - [Development Environment](#development-environment)
    - [Dataform Project Setup](#dataform-project-setup)
    - [Seed Sample Data (Optional - For Testing Purposes)](#seed-sample-data-optional---for-testing-purposes)
  - [Important Notes](#important-notes)
  - [References](#references)
    - [Dataform](#dataform)
    - [Google Cloud](#google-cloud-1)
  - [Repository Structure](#repository-structure)
  - [Supporting Repositories](#supporting-repositories)
  - [Developer Enhancement Tools](#developer-enhancement-tools)
  - [License](#license)
  - [Authors](#authors)
  - [TODO](#todo)

## Requirements
### Google Cloud
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a Google Cloud Project - [Create a Project](https://cloud.google.com/resource-manager/docs/creating-managing-projects)
   - Enable billing for your project - [Enable Billing](https://cloud.google.com/billing/docs/how-to/modify-project#enable_billing_for_a_new_project)
3. Enable the following APIs (they should be enabled by default, but double check) - [Enable APIs](https://cloud.google.com/apis/docs/getting-started)
  - `analyticshub.googleapis.com`
  - `bigquery.googleapis.com`
  - `bigqueryconnection.googleapis.com`
  - `bigquerydatapolicy.googleapis.com`
  - `bigquerydatatransfer.googleapis.com`
  - `bigquerymigration.googleapis.com`
  - `bigqueryreservation.googleapis.com`
  - `bigquerystorage.googleapis.com`
  - `dataform.googleapis.com`
  - `dataplex.googleapis.com`
  - `storage-component.googleapis.com`
  - `storage-api.googleapis.com`
  - `storage.googleapis.com`

---

### Development Environment
1. Install [Python](https://www.python.org/downloads/) (v3.10 or higher)
2. Install [Node.js](https://nodejs.org/en/download/) (v20 or higher)
3. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs)
4. Install [Dataform CLI](https://cloud.google.com/dataform/docs/use-dataform-cli) (v3.0.8 or higher, it is recommended to install it globally)
5. Authenticate with Google Cloud SDK using the following commands:
   1. `gcloud auth login` (This will open a browser window to authenticate with your Google Account)
   2. `gcloud config set project <PROJECT_ID>` (replace `<PROJECT_ID>` with your Google Cloud Project ID you created earlier)
   3. `gcloud auth application-default login` (This sets up the application default credentials for your project)
   4. `gcloud auth application-default set-quota-project <PROJECT_ID>` (This sets the quota project for your project)
---

### Dataform Project Setup
1. Clone your dataform repository
2. Navigate to your dataform repository
   1. `cd <REPOSITORY_PATH>`
3. Setup dataform authentication:
   1. `dataform init-creds`
   2. You will then be prompted to select your region, 1 for US, 2 for EU or 3 for Other, select the appropriate region
      - If you select 3, you will be prompted to enter the region, enter the region i.e. `australia-southeast1`
   3. You will then be prompted for ADC (default) or JSON Key (Service Account Keyfile), select the appropriate option
      - If you select JSON Key, you will be prompted to enter the path to the JSON Keyfile
      - If you select ADC, you will be prompted to enter your Google Cloud Billing Project ID
   4. OR create a `.df-credentials.json` file in the root of the directory with the following content for ADC:
    ```json
    {
      "projectId": "<PROJECT_ID>",
      "location": "<REGION>",
    }
    ```
4. Update your `workflow_settings.yaml` file with the appropriate settings for your project (Mandatory changes):
   - Update the `defaultProject` variable with your created Google Cloud Project ID
   - Update the `defaultLocation` variable with your region (i.e. `US`)
   - Update the `INPUT_BUCKET_1` variable with your Google Cloud Storage Bucket name (i.e. `gs://<BUCKET_NAME>`)
   - Update the `INPUT_BUCKET_2` variable with your Google Cloud Storage Bucket name (i.e. `gs://<BUCKET_NAME>`) (Required for seeding sample data)
5. Install dataform dependencies:
   - `dataform install` (This will install the necessary dependencies for your dataform project)
6. Compile your dataform project:
   - `dataform compile` (This will compile your dataform project, if there are no errors, you are good to go)
---

### Seed Sample Data (Optional - For Testing Purposes)
- Create a Google Cloud Storage Bucket - [Create a Bucket](https://cloud.google.com/storage/docs/creating-buckets) (This is where the sample data will be stored)
- Navigate to the root of the repository
- Execute `./scripts/seed_sample_data.sh` to seed sample data into a Google Cloud Storage Bucket you created
- Provide your Google Cloud Storage Bucket name when prompted (i.e `<BUCKET_NAME>` no need to include `gs://`)
- The script will seed sample data into your Google Cloud Storage Bucket
- Update the `workflow_settings.yaml` file with the Google Cloud Storage Bucket name you created to the `INPUT_BUCKET_2` variable

## Important Notes
- *The public dataset `bigquery-public-data.stackoverflow` is used in this repository. You will need to set your region to `US` to access this dataset in both the `workflow_settings.yaml` and the `.df-credentials.json` file.*
- *If your default region is set to `US`, please ensure your Google Cloud Storage Bucket reflects this*

## References
### Dataform
- [Documentation](https://cloud.google.com/dataform/docs/overview)
- [Best Practices](https://cloud.google.com/dataform/docs/best-practices)
- [Troubleshooting](https://cloud.google.com/dataform/docs/troubleshooting)
- [Core Github](https://github.com/dataform-co/dataform)
- [API Reference](https://cloud.google.com/dataform/reference/rest)
- [Core Reference](https://cloud.google.com/dataform/docs/reference/dataform-core-reference)
- [CLI Reference](https://cloud.google.com/dataform/docs/reference/dataform-cli-reference)
- [Stackoverflow Dataform Reference](https://github.com/dataform-co/dataform/tree/main/examples/stackoverflow_reporter)
- [Dataform Core - VSCode Extension](https://marketplace.visualstudio.com/items?itemName=dataform.dataform)

### Google Cloud
- [BigQuery](https://cloud.google.com/bigquery/docs)
- [Stackoverflow Public Dataset](https://console.cloud.google.com/bigquery?p=bigquery-public-data&d=stackoverflow&page=dataset)

## Repository Structure
```
.
├── .vscode                 // VSCode window settings (optional)
├── .github                 // Github Actions workflows
├── .vscode-dataform-tools  // VSCode Dataform extension tools
│   └── .sqlfluff           // SQLFluff configuration for Dataform
├── definitions             // Dataform definitions
│   ├── actions.yaml        // Action definitions
│   ├── 0_sources           // Data sources (raw data)
│   ├── 1_intermediate      // Intermediate/staging ("silver") tables
│   ├── 2_outputs           // Output/final ("gold") tables
│   ├── 3_assertions        // Data quality assertions
│   ├── 4_tests             // Tests (unit, etc.)
│   ├── 5_extras            // Operations, functions, scripts, etc.
│   └── 6_schemas           // BigQuery JSON schema files (optional)
├── includes                // Dataform includes (reusable JS code)
├── scripts                 // Shell scripts (e.g., seeding sample data)
├── .gitignore              // Files and directories ignored by Git
├── LICENSE                 // Project license
├── README.md               // Project description and documentation
└── workflow_settings.yaml  // Dataform workflow settings
```

## Supporting Repositories
- [Dataform Tooling](https://github.com/benjaminwestern/dataform-tooling) - A collection of tools and utilities for integrating Dataform into your new or existing environments
- [Dataform Terraform](https://github.com/benjaminwestern/dataform-terraform) - An example Terraform Module for deploying Dataform projects to Google Cloud Platform

## Developer Enhancement Tools
The following tools are recommended for improved code quality, debugging and provide additional features for an enhanced development experience:
- [Dataform Tools - VSCode Extension](https://marketplace.visualstudio.com/items?itemName=ashishalex.dataform-lsp-vscode) - Provides syntax highlighting, code completion, and linting for Dataform files
- [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) - Highlights inline errors and warnings in your code
- [SQLFluff - Python Package](https://docs.sqlfluff.com/en/stable/gettingstarted.html) - Linting and formatting for SQL files

## License
This repository is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Authors
- [Benjamin Western](https://benjaminwestern.io)

## TODO
Below is a list of items that I plan to implement in the future to provide a more comprehensive testing ground for Dataform features:
- [ ] Get `notebook` action in `actions.yaml` to actually create the notebook
- [ ] Add more BigQuery Config Examples (i.e. `partitionBy`, `clusterBy`, `expirationTime`, `labels`, `tags`, `policyTags`, etc.)
- [ ] Add example for `JS` implementation of `.sqlx` action types
  - [ ] `declare`
  - [ ] `view`
  - [ ] `table`
  - [ ] `incremental`
  - [ ] `operations`
  - [ ] `tests`
  - [ ] `assertions`