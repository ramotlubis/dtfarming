FROM python:3.9-slim

WORKDIR /app

COPY . /app

RUN pip install kubernetes

CMD ["python", "dtagent-controller.py"]
