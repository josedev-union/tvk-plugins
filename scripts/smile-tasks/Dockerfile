FROM ubuntu:18.04

ADD ./ /app/
WORKDIR /app

RUN apt-get update && apt-get install -y curl python build-essential checkinstall zlib1g-dev libssl-dev

ENV PATH=$PATH:/app/

CMD request.sh
