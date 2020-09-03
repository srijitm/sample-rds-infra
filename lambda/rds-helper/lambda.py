import psycopg2
import boto3
import base64
import cfnresponse
from botocore.exceptions import ClientError
import traceback
import json


def get_secret():
  secret_name = "/company/dept/project/rds/sample/sample-db"
  region_name = "ca-central-1"
  session = boto3.session.Session()
  client = session.client(
  service_name='secretsmanager',
  region_name=region_name
  )

  try:
    get_secret_value_response = client.get_secret_value(
      SecretId=secret_name
    )
  except ClientError as e:
    if e.response['Error']['Code'] == 'DecryptionFailureException':
      # Secrets Manager can't decrypt the protected secret text using the provided KMS key.
      # Deal with the exception here, and/or rethrow at your discretion.
      raise e
    elif e.response['Error']['Code'] == 'InternalServiceErrorException':
      # An error occurred on the server side.
      # Deal with the exception here, and/or rethrow at your discretion.
      raise e
    elif e.response['Error']['Code'] == 'InvalidParameterException':
      # You provided an invalid value for a parameter.
      # Deal with the exception here, and/or rethrow at your discretion.
      raise e
    elif e.response['Error']['Code'] == 'InvalidRequestException':
      # You provided a parameter value that is not valid for the current state of the resource.
      # Deal with the exception here, and/or rethrow at your discretion.
      raise e
    elif e.response['Error']['Code'] == 'ResourceNotFoundException':
      # We can't find the resource that you asked for.
      # Deal with the exception here, and/or rethrow at your discretion.
      raise e
  else:
    # Decrypts secret using the associated KMS CMK.
    # Depending on whether the secret is a string or binary, one of these fields will be populated.
    if 'SecretString' in get_secret_value_response:
      secret = get_secret_value_response['SecretString']
      return secret
    else:
      decoded_binary_secret = base64.b64decode(get_secret_value_response['SecretBinary'])
      return decoded_binary_secret

def create_conn(db_name, db_user, db_host, db_pass):
  print ("creating connection")
  conn = None
  try:
      conn = psycopg2.connect("dbname={} user={} host={} password={}".format(db_name,db_user,db_host,db_pass))
  except Exception as e:
      print("Cannot connect.")
      raise e
  return conn
    
def fetch(conn):
  result = []
  print("Now executing sql commands")
  file = open('schema.sql', 'r')
  script_file = file.read()
  file.close
  print(script_file)
  try: 
    cursor = conn.cursor()
    cursor.execute(script_file)
    print(cursor.description)
    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
    raw = cursor.fetchall()
    for line in raw:
        print(line)
        result.append(line)
  except Exception as e:
      print("Cannot fetch." + str(e) + traceback.format_exc())
      raise e
  return result
    
def get_cfn_response_data(message):
  response_data = {}
  data = {'Message': message}
  response_data['Data'] = data
  return response_data  

def lambda_handler(event, context):
  try:

    secret = json.loads(get_secret())
    db_host = secret["host"]
    db_name = secret["dbname"]
    db_port = secret["port"]
    db_user = secret["username"]
    db_pass = secret["password"]
    
    if event['RequestType'] == 'Create':
      try:
        # TODO: Run schema deployment here
        # get a connection, if a connect cannot be made an exception will be raised here
        conn = create_conn(db_name, db_user, db_host, db_pass)
        result = fetch(conn)
        conn.close()
        return result
      except Exception as e:
        cfnresponse.send(event, context, cfnresponse.FAILED, get_cfn_response_data('failed: '+str(e)))
        raise Exception(e)
    else: 
        print('Delete/Update CF initiated') 
        cfnresponse.send(event, context, cfnresponse.SUCCESS, get_cfn_response_data('delete'))  
  except Exception as e:
    cfnresponse.send(event, context, cfnresponse.FAILED, get_cfn_response_data('failed: '+str(e)))
    raise Exception(e)
  
