from visMOP.main import create_app
import sys

if __name__ == "__main__":
    create_app(sys.argv[1], int(sys.argv[2]), sys.argv[2]).run(debug=True)
