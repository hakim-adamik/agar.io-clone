#!/bin/bash

# Agar.io Clone - Preview Environment Cleanup Script
# This script helps manage and clean up preview deployments on Google Cloud Run

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="raga-io-476815"
REGION="europe-west1"

echo -e "${PURPLE}🧹 Google Cloud Run Preview Cleanup Tool${NC}"
echo ""

# Check prerequisites
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed${NC}"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID --quiet

# Function to list all preview services
list_previews() {
    echo -e "${BLUE}📋 Current Preview Deployments:${NC}"
    echo ""

    PREVIEWS=$(gcloud run services list --region=$REGION --filter="metadata.name:preview-*" --format="value(metadata.name)" 2>/dev/null)

    if [ -z "$PREVIEWS" ]; then
        echo "  No preview deployments found."
        return 1
    fi

    # Show detailed table
    gcloud run services list --region=$REGION --filter="metadata.name:preview-*" \
        --format="table(SERVICE:label=SERVICE,metadata.labels.branch:label=BRANCH,LAST_DEPLOYED:label=DEPLOYED,URL)" 2>/dev/null

    echo ""
    return 0
}

# Function to delete a specific preview
delete_preview() {
    local service_name=$1
    echo -e "${YELLOW}Deleting preview: $service_name${NC}"

    gcloud run services delete $service_name --region=$REGION --quiet

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Deleted: $service_name${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to delete: $service_name${NC}"
        return 1
    fi
}

# Function to delete all previews
delete_all_previews() {
    echo -e "${RED}⚠️  WARNING: This will delete ALL preview deployments!${NC}"
    read -p "Are you sure? Type 'yes' to confirm: " confirmation

    if [ "$confirmation" != "yes" ]; then
        echo "Cancelled."
        return
    fi

    PREVIEWS=$(gcloud run services list --region=$REGION --filter="metadata.name:preview-*" --format="value(metadata.name)" 2>/dev/null)

    if [ -z "$PREVIEWS" ]; then
        echo "No preview deployments to delete."
        return
    fi

    for preview in $PREVIEWS; do
        delete_preview $preview
    done

    echo -e "${GREEN}✅ All preview deployments deleted${NC}"
}

# Function to delete old previews (older than N days)
delete_old_previews() {
    local days=${1:-7}  # Default to 7 days
    echo -e "${YELLOW}Checking for previews older than $days days...${NC}"

    # Get current date in seconds
    CURRENT_DATE=$(date +%s)
    CUTOFF_DATE=$(($CURRENT_DATE - ($days * 24 * 60 * 60)))

    DELETED_COUNT=0

    # Get all preview services with their last deployed time
    while IFS= read -r line; do
        if [ -z "$line" ]; then
            continue
        fi

        SERVICE_NAME=$(echo $line | awk '{print $1}')
        LAST_DEPLOYED=$(echo $line | awk '{print $2}')

        # Convert last deployed to seconds
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS date command
            DEPLOYED_SECONDS=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${LAST_DEPLOYED%%.*}" +%s 2>/dev/null || echo 0)
        else
            # Linux date command
            DEPLOYED_SECONDS=$(date -d "${LAST_DEPLOYED}" +%s 2>/dev/null || echo 0)
        fi

        if [ $DEPLOYED_SECONDS -lt $CUTOFF_DATE ] && [ $DEPLOYED_SECONDS -gt 0 ]; then
            echo "  Found old preview: $SERVICE_NAME (deployed: $LAST_DEPLOYED)"
            delete_preview $SERVICE_NAME
            ((DELETED_COUNT++))
        fi
    done < <(gcloud run services list --region=$REGION --filter="metadata.name:preview-*" --format="value(metadata.name,metadata.annotations.serving.knative.dev/lastModifier)" 2>/dev/null)

    if [ $DELETED_COUNT -eq 0 ]; then
        echo "No old previews found."
    else
        echo -e "${GREEN}✅ Deleted $DELETED_COUNT old preview(s)${NC}"
    fi
}

# Main menu
show_menu() {
    echo -e "${BLUE}Choose an action:${NC}"
    echo "  1) List all preview deployments"
    echo "  2) Delete a specific preview"
    echo "  3) Delete previews older than N days"
    echo "  4) Delete ALL preview deployments"
    echo "  5) Exit"
    echo ""
}

# Main script
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --list              List all preview deployments"
    echo "  --delete SERVICE    Delete a specific preview service"
    echo "  --delete-old [DAYS] Delete previews older than N days (default: 7)"
    echo "  --delete-all        Delete all preview deployments"
    echo "  --help              Show this help message"
    echo ""
    echo "Interactive mode: Run without arguments for interactive menu"
    exit 0
fi

# Handle command line arguments
if [ "$1" == "--list" ]; then
    list_previews
    exit 0
elif [ "$1" == "--delete" ] && [ -n "$2" ]; then
    delete_preview "$2"
    exit 0
elif [ "$1" == "--delete-old" ]; then
    DAYS=${2:-7}
    delete_old_previews $DAYS
    exit 0
elif [ "$1" == "--delete-all" ]; then
    delete_all_previews
    exit 0
elif [ -n "$1" ]; then
    echo -e "${RED}Unknown option: $1${NC}"
    echo "Use --help for usage information"
    exit 1
fi

# Interactive mode
while true; do
    show_menu
    read -p "Enter choice [1-5]: " choice

    case $choice in
        1)
            echo ""
            list_previews
            echo ""
            ;;
        2)
            echo ""
            if list_previews; then
                echo ""
                read -p "Enter service name to delete (or 'cancel'): " service_name
                if [ "$service_name" != "cancel" ] && [ -n "$service_name" ]; then
                    delete_preview "$service_name"
                fi
            fi
            echo ""
            ;;
        3)
            echo ""
            read -p "Delete previews older than how many days? [7]: " days
            days=${days:-7}
            delete_old_previews $days
            echo ""
            ;;
        4)
            echo ""
            delete_all_previews
            echo ""
            ;;
        5)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            echo ""
            ;;
    esac
done