// stdin: hex(word) per line; stdout: hex(word) TAB comma-separated hex(suggestions). args: aff dic
#include <hunspell.hxx>
#include <iostream>
#include <string>
#include <vector>
static std::string unhex(const std::string& h) { std::string o; for (size_t i = 0; i + 1 < h.size(); i += 2) o += (char)std::stoi(h.substr(i, 2), nullptr, 16); return o; }
static std::string hex(const std::string& s) { static const char* d = "0123456789abcdef"; std::string o; for (unsigned char c : s) { o += d[c >> 4]; o += d[c & 15]; } return o; }
int main(int, char** argv) {
  Hunspell h(argv[1], argv[2]);
  std::string line;
  while (std::getline(std::cin, line)) {
    std::vector<std::string> s = h.suggest(unhex(line));
    std::cout << line << '\t';
    for (size_t i = 0; i < s.size(); i++) std::cout << (i ? "," : "") << hex(s[i]);
    std::cout << '\n' << std::flush;
  }
}
