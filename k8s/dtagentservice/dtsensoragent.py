import time
import random
import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError

class SensorAgent:
    def __init__(self, sensor_type, sensor_id, sensor_location_id, sitewise_asset_id, sitewise_property_id, edge_enabled=False):
        self.sensor_type = sensor_type
        self.sensor_id = sensor_id
        self.sensor_location_id = sensor_location_id
        self.sitewise_asset_id = sitewise_asset_id
        self.sitewise_property_id = sitewise_property_id
        self.edge_enabled = edge_enabled  # Edge processing enabled flag
        self.sitewise_client = boto3.client('iotsitewise', region_name='us-west-2')

    def read_sensor_data(self):
        # Simulate sensor data reading based on sensor type
        sensor_value = {
            'temperature': random.uniform(15.0, 35.0),
            'light': random.uniform(100.0, 1000.0),
            'co2': random.uniform(300.0, 5000.0),
            'humidity': random.uniform(30.0, 80.0)
        }.get(self.sensor_type, 0.0)

        return {
            'sensor_type': self.sensor_type,
            'sensor_id': self.sensor_id,
            'sensor_location_id': self.sensor_location_id,
            'value': sensor_value,
            'timestamp': int(time.time() * 1000)  # SiteWise requires timestamp in milliseconds
        }

    def push_data_to_sitewise(self, data):
        try:
            if self.edge_enabled:
                # Logic for pushing data to the SiteWise Edge gateway
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
                print(f"Pushed data to SiteWise Edge Gateway: {data}")
            else:
                # Logic for pushing data directly to the cloud
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
                print(f"Pushed data to SiteWise Cloud: {data}")
        except (NoCredentialsError, PartialCredentialsError) as e:
            print(f"Error pushing data: {e}")

    def run(self, interval=10):
        while True:
            data = self.read_sensor_data()
            self.push_data_to_sitewise(data)
            time.sleep(interval)

if __name__ == "__main__":
    # Example usage
    sensor_type = "temperature"  # Change to "light", "co2", or "humidity" for other sensors
    sensor_id = "temp-sensor-001"
    sensor_location_id = "location-001"
    sitewise_asset_id = "your-sitewise-asset-id"
    sitewise_property_id = "your-sitewise-property-id"
    edge_enabled = True  # Set this to True if running on SiteWise Edge

    agent = SensorAgent(sensor_type, sensor_id, sensor_location_id, sitewise_asset_id, sitewise_property_id, edge_enabled)
    agent.run()
