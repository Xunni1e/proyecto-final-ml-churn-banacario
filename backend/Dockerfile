FROM public.ecr.aws/lambda/python:3.11

COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir --only-binary=:all:

COPY app/ ./app/
COPY artifacts/ ./artifacts/
COPY main.py .

CMD ["main.handler"]