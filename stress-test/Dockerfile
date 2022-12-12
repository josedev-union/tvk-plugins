FROM ruby:2.7-buster
MAINTAINER support@tastytech.ca

RUN apt-get update && apt-get install -y sudo build-essential curl openssl

WORKDIR /app

ADD . .

CMD ["sh", "-c", "tail -f /dev/null"]
