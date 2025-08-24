import http.server
import socketserver
import urllib.request
import urllib.parse
import sys
import os

PORT = 8000
API_KEY = input("Enter your Last.fm API key: ").strip()

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/lastfm/'):
            # Extract query params after /lastfm/
            query = self.path[len('/lastfm/'):]
            params = urllib.parse.parse_qs(query)
            params['api_key'] = [API_KEY]
            params['format'] = ['json']
            url = 'https://ws.audioscrobbler.com/2.0/?' + urllib.parse.urlencode(params, doseq=True)
            try:
                with urllib.request.urlopen(url) as response:
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(response.read())
            except Exception as e:
                self.send_response(502)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f'Error proxying to Last.fm: {e}'.encode())
        else:
            super().do_GET()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        httpd.serve_forever()
