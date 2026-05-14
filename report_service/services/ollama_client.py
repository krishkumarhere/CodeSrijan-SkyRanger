import requests

OLLAMA_URL = "http://10.239.125.125:11434/api/generate"


def generate_report(prompt):

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": "phi4",
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_predict": 350,
                    "temperature": 0.4
                }
            },
            timeout=300
        )

        response.raise_for_status()

        data = response.json()

        return data["response"]

    except requests.exceptions.Timeout:
        return "ERROR: Ollama request timed out."

    except requests.exceptions.ConnectionError:
        return "ERROR: Could not connect to Ollama server."

    except Exception as e:
        return f"ERROR: {str(e)}"