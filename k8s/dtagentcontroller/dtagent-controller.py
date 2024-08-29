from kubernetes import client, config, watch
from kubernetes.client.rest import ApiException

# Load Kubernetes configuration
config.load_kube_config()

# API clients
apps_v1 = client.AppsV1Api()
crd_api = client.CustomObjectsApi()

# Custom Resource group, version, and namespace
CRD_GROUP = "digitaltwin.example.com"
CRD_VERSION = "v1"
NAMESPACE = "default"
CRD_PLURAL = "sensoragents"

def create_or_update_deployment(sensor_agent):
    name = sensor_agent['metadata']['name']
    sensor_type = sensor_agent['spec']['sensorType']
    image = sensor_agent['spec']['image']
    sensor_id = sensor_agent['spec']['sensorId']
    sensor_location_id = sensor_agent['spec']['sensorLocationId']
    sitewise_asset_id = sensor_agent['spec']['sitewiseAssetId']
    sitewise_property_id = sensor_agent['spec']['sitewisePropertyId']
    replicas = sensor_agent['spec'].get('replicas', 1)

    deployment = client.V1Deployment(
        metadata=client.V1ObjectMeta(name=name),
        spec=client.V1DeploymentSpec(
            replicas=replicas,
            selector=client.V1LabelSelector(
                match_labels={"app": name}
            ),
            template=client.V1PodTemplateSpec(
                metadata=client.V1ObjectMeta(labels={"app": name}),
                spec=client.V1PodSpec(
                    containers=[
                        client.V1Container(
                            name=name,
                            image=image,
                            env=[
                                client.V1EnvVar(name="SENSOR_TYPE", value=sensor_type),
                                client.V1EnvVar(name="SENSOR_ID", value=sensor_id),
                                client.V1EnvVar(name="SENSOR_LOCATION_ID", value=sensor_location_id),
                                client.V1EnvVar(name="SITEWISE_ASSET_ID", value=sitewise_asset_id),
                                client.V1EnvVar(name="SITEWISE_PROPERTY_ID", value=sitewise_property_id),
                            ]
                        )
                    ]
                )
            )
        )
    )

    try:
        apps_v1.read_namespaced_deployment(name=name, namespace=NAMESPACE)
        print(f"Updating deployment {name}")
        apps_v1.patch_namespaced_deployment(name=name, namespace=NAMESPACE, body=deployment)
    except ApiException as e:
        if e.status == 404:
            print(f"Creating deployment {name}")
            apps_v1.create_namespaced_deployment(namespace=NAMESPACE, body=deployment)
        else:
            raise

def delete_deployment(name):
    try:
        apps_v1.delete_namespaced_deployment(name=name, namespace=NAMESPACE)
        print(f"Deleted deployment {name}")
    except ApiException as e:
        if e.status != 404:
            raise

def main():
    w = watch.Watch()
    for event in w.stream(crd_api.list_namespaced_custom_object, group=CRD_GROUP, version=CRD_VERSION, namespace=NAMESPACE, plural=CRD_PLURAL):
        event_type = event['type']
        sensor_agent = event['object']
        name = sensor_agent['metadata']['name']

        if event_type in ['ADDED', 'MODIFIED']:
            create_or_update_deployment(sensor_agent)
        elif event_type == 'DELETED':
            delete_deployment(name)

if __name__ == "__main__":
    main()
