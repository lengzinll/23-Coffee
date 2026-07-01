.PHONY: deploy

REMOTE_USER := nsm-tech
REMOTE_HOST := 192.168.39.51
REMOTE_DIR := /home/nsm-tech/Desktop/project/23coffee

deploy:
	docker compose build
	docker compose push
	ssh $(REMOTE_USER)@$(REMOTE_HOST) "\
		set -e; \
		cd $(REMOTE_DIR); \
		docker compose pull; \
		docker compose up -d; \
		docker system prune -af"