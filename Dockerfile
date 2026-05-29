FROM node:22-alpine
RUN npm install -g @zhouzhengchang/token-party
VOLUME /root/.tokenparty
EXPOSE 3456
CMD ["tokenparty"]
