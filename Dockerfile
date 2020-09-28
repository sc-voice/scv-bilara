# UBUNTU slim but not sveldt (385MB)
FROM ubuntu:latest
RUN apt-get update && apt-get upgrade -y
ENV INSTALL="apt-get install -y"
RUN $INSTALL ripgrep
RUN $INSTALL sudo
RUN $INSTALL curl
RUN $INSTALL nodejs
RUN echo "unroot    ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
RUN useradd unroot -s /bin/bash -m 
RUN usermod -aG sudo unroot
LABEL maintainer="karl@oyamist.com"

# DEBIAN is morbidly obese at 1.1GB
#FROM node:12-buster 

# ALPINE is tiny but doesn't support ripgrep yet <300MB
#FROM node:12-alpine 
#RUN apk update 
#ENV INSTALL="apk add"
#RUN $INSTALL bash
#RUN adduser -D -s /bin/bash unroot
#RUN echo "export PS1=\"\u@\h:\w\$\"" >> /home/unroot/.bashrc
#RUN echo "Set disable_coredump false" >> /etc/sudo.conf

# Application setup
COPY src /home/unroot/src
COPY scripts /home/unroot/scripts
COPY index.js /home/unroot/index.js
COPY local/bilara-data /home/unroot/local/bilara-data
COPY node_modules/just-simple /home/unroot/node_modules/just-simple
COPY node_modules/log-instance /home/unroot/node_modules/log-instance
COPY node_modules/json5 /home/unroot/node_modules/json5
COPY node_modules/js-ebt /home/unroot/node_modules/js-ebt

# Finalize
RUN chown -R unroot:unroot /home/unroot
RUN /home/unroot/scripts/js/prune-stubs.js rm
CMD [ "bash", "-c", "su -l unroot" ]
