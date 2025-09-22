#!/usr/bin/env python3
"""
Park Commonbase API Test Script

A Python script to test all Park Commonbase API endpoints.
Make sure to set your API key and have the server running on localhost:3000
"""

import requests
import json
import os
import sys
import time
from pathlib import Path
import argparse

# Configuration
API_KEY = "testkey"  
BASE_URL = "http://localhost:3000"
COLLECTION = "test-park"

class APITester:
    def __init__(self, api_key, base_url, collection):
        self.api_key = api_key
        self.base_url = base_url
        self.collection = collection
        self.session = requests.Session()

    def log(self, message, level="INFO"):
        """Log messages with level indicators"""
        levels = {
            "INFO": "[INFO]",
            "OK": "[OK]",
            "ERROR": "[ERROR]",
            "WARN": "[WARN]",
            "TEST": "[TEST]",
            "ADMIN": "[ADMIN]"
        }
        print(f"{levels.get(level, '[INFO]')} {message}")

    def check_server(self):
        """Check if server is running"""
        try:
            response = self.session.get(self.base_url, timeout=5)
            self.log("Server is running", "OK")
            return True
        except requests.exceptions.RequestException:
            self.log(f"Server is not running at {self.base_url}", "ERROR")
            self.log("Please start the server with: npm run dev", "ERROR")
            return False

    def test_api_key(self):
        """Test if API key is valid"""
        self.log("Testing API Key...", "TEST")

        if self.api_key == "your_api_key_here":
            self.log("Please set your actual API key in the script", "ERROR")
            return False

        headers = {"x-api-key": self.api_key}
        try:
            response = self.session.get(f"{self.base_url}/api/collection/default", headers=headers)
            if response.status_code == 401:
                self.log("Invalid API key", "ERROR")
                return False
            elif response.status_code == 200:
                self.log("API key is valid", "OK")
                return True
            else:
                self.log(f"Unexpected response: {response.status_code}", "WARN")
                return True
        except requests.exceptions.RequestException as e:
            self.log(f"Error testing API key: {e}", "ERROR")
            return False

    def add_text_entry(self):
        """Add a text entry"""
        self.log("Adding text entry...", "TEST")

        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key
        }

        data = {
            "data": "Beautiful sunny day at the park. Kids are playing on the swings and families are having picnics.",
            "collection": self.collection,
            "metadata": {
                "author": {
                    "name": "John Doe",
                    "instagram": "johndoe"
                }
            }
        }

        try:
            response = self.session.post(f"{self.base_url}/api/add", headers=headers, json=data)
            result = response.json()
            print(json.dumps(result, indent=2))
            return result.get("id") if response.status_code == 200 else None
        except Exception as e:
            self.log(f"Error adding text entry: {e}", "ERROR")
            return None

    def add_text_comment(self):
        """Add a text comment to an existing entry"""
        self.log("Adding text comment...", "TEST")

        # Get parent entry ID
        parent_id = self.get_first_entry_id()
        if not parent_id:
            self.log("No parent entry found. Please add a text entry first.", "ERROR")
            return None

        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key
        }

        data = {
            "data": "I totally agree! The weather is perfect for outdoor activities.",
            "collection": self.collection,
            "parentId": parent_id,
            "metadata": {
                "author": {
                    "name": "Jane Smith"
                }
            }
        }

        self.log(f"Adding comment to entry: {parent_id}")
        try:
            response = self.session.post(f"{self.base_url}/api/add", headers=headers, json=data)
            result = response.json()
            print(json.dumps(result, indent=2))
            return result.get("id") if response.status_code == 200 else None
        except Exception as e:
            self.log(f"Error adding comment: {e}", "ERROR")
            return None

    def add_image_entry(self):
        """Add an image entry"""
        self.log("Adding image entry...", "TEST")

        # Create a test image if it doesn't exist
        test_image_path = "test-image.jpg"
        if not os.path.exists(test_image_path):
            self.log("Creating test image file...")
            # Create a minimal JPEG for testing
            jpeg_data = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xd9'
            with open(test_image_path, 'wb') as f:
                f.write(jpeg_data)
            self.log("Created minimal test image. For real testing, use a proper JPEG image.", "WARN")

        headers = {"x-api-key": self.api_key}

        files = {'image': open(test_image_path, 'rb')}
        data = {
            'collection': self.collection,
            'metadata': json.dumps({
                "author": {
                    "name": "Alice Johnson",
                    "instagram": "alicephotos"
                }
            })
        }

        try:
            response = self.session.post(f"{self.base_url}/api/add_image", headers=headers, files=files, data=data)
            result = response.json()
            print(json.dumps(result, indent=2))
            return result.get("id") if response.status_code == 200 else None
        except Exception as e:
            self.log(f"Error adding image entry: {e}", "ERROR")
            return None
        finally:
            files['image'].close()

    def add_audio_entry(self):
        """Add an audio entry"""
        self.log("Adding audio entry...", "TEST")

        # Create a test audio if it doesn't exist
        test_audio_path = "test-audio.mp3"
        if not os.path.exists(test_audio_path):
            self.log("Creating test audio file...")
            # Create a minimal MP3 header for testing
            mp3_data = b'\xff\xfb\x90\x00'
            with open(test_audio_path, 'wb') as f:
                f.write(mp3_data)
            self.log("Created minimal test audio. For real testing, use a proper MP3 file.", "WARN")

        headers = {"x-api-key": self.api_key}

        files = {'audio': open(test_audio_path, 'rb')}
        data = {
            'collection': self.collection,
            'metadata': json.dumps({
                "author": {
                    "name": "Bob Wilson",
                    "url": "https://bobwilson.com"
                }
            })
        }

        try:
            response = self.session.post(f"{self.base_url}/api/add_audio", headers=headers, files=files, data=data)
            result = response.json()
            print(json.dumps(result, indent=2))
            return result.get("id") if response.status_code == 200 else None
        except Exception as e:
            self.log(f"Error adding audio entry: {e}", "ERROR")
            return None
        finally:
            files['audio'].close()

    def get_collection_data(self):
        """Get collection data"""
        self.log("Getting collection data...", "TEST")

        headers = {"x-api-key": self.api_key}

        try:
            response = self.session.get(f"{self.base_url}/api/collection/{self.collection}", headers=headers)
            result = response.json()
            print(json.dumps(result, indent=2))
            return result if response.status_code == 200 else None
        except Exception as e:
            self.log(f"Error getting collection data: {e}", "ERROR")
            return None

    def export_csv(self):
        """Export CSV"""
        self.log("Exporting CSV...", "TEST")

        headers = {"x-api-key": self.api_key}

        try:
            response = self.session.get(f"{self.base_url}/api/export_csv?collection={self.collection}", headers=headers)

            if response.status_code == 200:
                filename = f"export-{self.collection}.csv"
                with open(filename, 'w') as f:
                    f.write(response.text)
                self.log(f"CSV exported to: {filename}", "OK")

                # Show first few lines
                print("First few lines:")
                lines = response.text.split('\n')[:3]
                for line in lines:
                    print(line)
                return filename
            else:
                self.log("Failed to export CSV", "ERROR")
                return None
        except Exception as e:
            self.log(f"Error exporting CSV: {e}", "ERROR")
            return None

    def admin_signin(self):
        """Admin signin"""
        self.log("Admin signin...", "ADMIN")

        data = {
            "username": "admin",
            "password": "password"
        }

        try:
            response = self.session.post(f"{self.base_url}/api/admin_signin", json=data)
            result = response.json()
            print(json.dumps(result, indent=2))

            if response.status_code == 200:
                self.log("Session cookie saved", "OK")
                return True
            else:
                return False
        except Exception as e:
            self.log(f"Error signing in: {e}", "ERROR")
            return False

    def delete_entry(self):
        """Delete an entry (admin required)"""
        self.log("Deleting entry - admin required...", "ADMIN")

        entry_id = self.get_first_entry_id()
        if not entry_id:
            self.log("No entry found to delete", "ERROR")
            return False

        self.log(f"Attempting to delete entry: {entry_id}")
        try:
            response = self.session.delete(f"{self.base_url}/api/delete_entry/{entry_id}")
            result = response.json()
            print(json.dumps(result, indent=2))
            return response.status_code == 200
        except Exception as e:
            self.log(f"Error deleting entry: {e}", "ERROR")
            return False

    def delete_comment(self):
        """Delete a comment (admin required)"""
        self.log("Deleting comment - admin required...", "ADMIN")

        comment_id = self.get_first_comment_id()
        if not comment_id:
            self.log("No comment found to delete", "ERROR")
            return False

        self.log(f"Attempting to delete comment: {comment_id}")
        try:
            response = self.session.delete(f"{self.base_url}/api/delete_comment/{comment_id}")
            result = response.json()
            print(json.dumps(result, indent=2))
            return response.status_code == 200
        except Exception as e:
            self.log(f"Error deleting comment: {e}", "ERROR")
            return False

    def get_first_entry_id(self):
        """Get the first entry ID from the collection"""
        headers = {"x-api-key": self.api_key}
        try:
            response = self.session.get(f"{self.base_url}/api/collection/{self.collection}", headers=headers)
            if response.status_code == 200:
                entries = response.json()
                return entries[0]['id'] if entries else None
        except:
            return None

    def get_first_comment_id(self):
        """Get the first comment ID from the collection"""
        headers = {"x-api-key": self.api_key}
        try:
            response = self.session.get(f"{self.base_url}/api/collection/{self.collection}", headers=headers)
            if response.status_code == 200:
                entries = response.json()
                for entry in entries:
                    if entry.get('parentId'):
                        return entry['id']
        except:
            return None

    def cleanup(self):
        """Clean up test files"""
        self.log("Cleaning up test files...", "INFO")
        for filename in ["test-image.jpg", "test-audio.mp3"]:
            if os.path.exists(filename):
                os.remove(filename)
        self.log("Cleanup complete", "OK")

    def run_all_tests(self):
        """Run all tests"""
        if not self.check_server():
            return False

        if not self.test_api_key():
            return False

        self.log("Starting API tests...", "TEST")

        # Test basic endpoints
        self.add_text_entry()
        time.sleep(1)
        self.add_text_comment()
        time.sleep(1)
        self.add_image_entry()
        time.sleep(1)
        self.add_audio_entry()
        time.sleep(1)
        self.get_collection_data()
        time.sleep(1)
        self.export_csv()

        # Test admin endpoints
        self.log("Testing admin endpoints...", "ADMIN")
        if self.admin_signin():
            time.sleep(1)
            self.delete_entry()
            time.sleep(1)
            self.delete_comment()

        self.log("All tests completed!", "OK")
        self.log("Check the exported CSV file and review the responses above.")

        self.cleanup()
        return True

def main():
    parser = argparse.ArgumentParser(description='Park Commonbase API Test Script')
    parser.add_argument('command', nargs='?', default='all',
                       choices=['all', 'text', 'comment', 'image', 'audio', 'get', 'csv',
                               'admin', 'delete-entry', 'delete-comment', 'help'],
                       help='Command to run')
    parser.add_argument('--api-key', help='API key to use')
    parser.add_argument('--base-url', default=BASE_URL, help='Base URL of the server')
    parser.add_argument('--collection', default=COLLECTION, help='Collection name to use')

    args = parser.parse_args()

    if args.command == 'help':
        parser.print_help()
        print("\nBefore running, make sure to:")
        print("1. Update the API_KEY variable in this script, or use --api-key")
        print("2. Start the server with: npm run dev")
        print("3. Set up your environment variables")
        return

    api_key = args.api_key or API_KEY

    if api_key == "your_api_key_here":
        print("[ERROR] Please set your actual API key!")
        print("Either update the API_KEY variable in this script or use --api-key")
        sys.exit(1)

    tester = APITester(api_key, args.base_url, args.collection)

    if not tester.check_server() or not tester.test_api_key():
        sys.exit(1)

    # Run specific command
    if args.command == 'all':
        tester.run_all_tests()
    elif args.command == 'text':
        tester.add_text_entry()
    elif args.command == 'comment':
        tester.add_text_comment()
    elif args.command == 'image':
        tester.add_image_entry()
    elif args.command == 'audio':
        tester.add_audio_entry()
    elif args.command == 'get':
        tester.get_collection_data()
    elif args.command == 'csv':
        tester.export_csv()
    elif args.command == 'admin':
        tester.admin_signin()
    elif args.command == 'delete-entry':
        if tester.admin_signin():
            tester.delete_entry()
    elif args.command == 'delete-comment':
        if tester.admin_signin():
            tester.delete_comment()

if __name__ == "__main__":
    print("[START] Park Commonbase API Test Script")
    print("=" * 50)
    main()