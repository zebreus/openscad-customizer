// Minimalistic cat C++ implementation
#include <iostream>
#include <fstream>

int main(int argc, char *argv[]) {
    // Disable buffering
    std::cout.setf(std::ios::unitbuf);

    // No arguments -> copy stdin
    if (argc == 1) {
        char c;
        while (std::cin.get(c)) std::cout << c;
        return 0;
    }
    for (int i = 1; i < argc; i++) {
        std::ifstream file(argv[i]);
        if (!file.is_open()) {
            std::cerr << "Error: Could not open file " << argv[i] << std::endl;
            return 1;
        }
        char c;
        while (file.get(c)) std::cout << c;
        file.close();
    }
    return 0;
}