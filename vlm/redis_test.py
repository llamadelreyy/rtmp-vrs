#!/usr/bin/env python3
"""
A simple script to test Redis connectivity.
"""

import sys
import redis
import argparse
from typing import Optional


def test_redis_connection(host: str = "localhost", 
                          port: int = 6379, 
                          password: Optional[str] = None, 
                          db: int = 0) -> bool:
    """
    Test connection to a Redis server.
    
    Args:
        host: Redis server hostname or IP address
        port: Redis server port
        password: Redis password if authentication is required
        db: Redis database number
        
    Returns:
        Boolean indicating if the connection was successful
    """
    try:
        # Create Redis client
        r = redis.Redis(
            host=host,
            port=port,
            password=password,
            db=db,
            socket_timeout=5
        )
        
        # Test connection with a PING command
        response = r.ping()
        
        if response:
            print(f"✅ Successfully connected to Redis at {host}:{port}, db={db}")
            
            # Get additional info about the Redis server
            info = r.info()
            print(f"Redis version: {info.get('redis_version', 'unknown')}")
            print(f"Redis mode: {info.get('redis_mode', 'standalone')}")
            print(f"Total connections: {info.get('total_connections_received', 'unknown')}")
            print(f"Connected clients: {info.get('connected_clients', 'unknown')}")
            print(f"Memory used: {info.get('used_memory_human', 'unknown')}")
            
            return True
        else:
            print(f"❌ Connected to Redis at {host}:{port}, but ping failed")
            return False
            
    except redis.ConnectionError as e:
        print(f"❌ Failed to connect to Redis at {host}:{port}")
        print(f"Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def main():
    """Parse command line arguments and test Redis connection."""
    parser = argparse.ArgumentParser(description="Test Redis server connectivity")
    parser.add_argument("--host", default="localhost", help="Redis server hostname or IP")
    parser.add_argument("--port", type=int, default=6379, help="Redis server port")
    parser.add_argument("--password", help="Redis password (if required)")
    parser.add_argument("--db", type=int, default=0, help="Redis database number")
    
    args = parser.parse_args()
    
    success = test_redis_connection(
        host=args.host,
        port=args.port,
        password=args.password,
        db=args.db
    )
    
    # Return appropriate exit code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()