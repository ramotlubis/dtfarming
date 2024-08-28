# Base image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install required Python packages
RUN pip install boto3

# Run sensor agent
CMD ["python", "dtsensoragent.py"]
