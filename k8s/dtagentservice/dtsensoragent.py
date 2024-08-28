import time
import random
import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError

class SensorAgent:
    def __init__(self, sensor_type, sitewise_asset_id, sitewise_property_id):
        self.sensor_type = sensor_type
        self.sitewise_asset_id = sitewise_asset_id
        self.sitewise_property_id = sitewise_property_id
        self.sitewise_client = boto3.client('iotsitewise', region_name='us-west-2')

    def read_sensor_data(self):
        # Simulate sensor data reading
        return {
            'sensor_type': self.sensor_type,
            'value': random.uniform(10.0, 30.0),  # Adjust ranges based on the sensor type
            'timestamp': int(time.time() * 1000)  # SiteWise requires timestamp in milliseconds
        }

    def push_data_to_sitewise(self, data):
        try:
            response = self.sitewise_client.put_asset_property_value(
                assetId=self.sitewise_asset_id,
                propertyId=self.sitewise_property_id,
                propertyValues=[
                    {
                        'value': {
                            'doubleValue': data['value']
                        },
                        'timestamp': {
                            'timeInSeconds': int(data['timestamp'] / 1000),
                            'offsetInNanos': 0
                        },
                        'quality': 'GOOD'
                    }
                ]
            )
            print(f"Successfully pushed data to SiteWise: {data}")
        except (NoCredentialsError, PartialCredentialsError) as e:
            print(f"Error pushing data to SiteWise: {e}")

    def run(self, interval=10):
        while True:
            data = self.read_sensor_data()
            self.push_data_to_sitewise(data)
            time.sleep(interval)

if __name__ == "__main__":
    sensor_type = "temperature"  # Change to "light", "co2", or "humidity" for other sensors
    sitewise_asset_id = "your-sitewise-asset-id"
    sitewise_property_id = "your-sitewise-property-id"
    
    agent = SensorAgent(sensor_type, sitewise_asset_id, sitewise_property_id)
    agent.run()
