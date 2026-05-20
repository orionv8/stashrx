
import json
from hermes_tools import read_file

def read_full_file(path):
    full_content = ""
    offset = 1
    while True:
        response = read_file(path=path, offset=offset, limit=1000)
        if response and response.get("content"):
            full_content += response["content"]
            if response.get("truncated"):
                offset += 1000
            else:
                break
        else:
            break
    return full_content

if __name__ == "__main__":
    file_path = "/home/orionv888/.hermes/mockups/stashrx/app.html"
    content = read_full_file(file_path)
    print(content)
