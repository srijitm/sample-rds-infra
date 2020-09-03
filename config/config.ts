type ProjectConfig = {
  naming: {
    company: string,
    dept: string,
    project: string
  },
  deployment: {
    region: string
  },
  tags: {
    app: string
    dept: string
  },
  database: {
    admin: string
    dbname: string
  }
}

const config: ProjectConfig = {
  "naming": {
    "company": "company",
    "dept": "dept",
    "project":  "project"
  },
  "deployment": {
    "region": "ca-central-1"
  },
  "tags": {
    "app": "sample-app",
    "dept": "dept"
  },
  "database": {
    "admin": "sampleadmin",
    "dbname": "sampledb"
  }
}

export default config