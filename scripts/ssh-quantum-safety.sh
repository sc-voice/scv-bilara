#!/bin/bash

# SSH Quantum Safety Evaluation Script
# Evaluates local computer's SSH quantum safety compliance with GitHub 2025 guidelines
#
# Usage:
#   ./ssh-quantum-safety.sh                  (check system SSH capabilities only)
#   ./ssh-quantum-safety.sh --check-certificates (also check local SSH key types)
#   ./ssh-quantum-safety.sh --reference      (show GitHub documentation reference)
#   ./ssh-quantum-safety.sh --intro          (show non-technical summary)

check_certificates=false

# Function to print intro
print_intro() {
    cat <<'EOF'
## GitHub SSH Quantum Security Update - What You Need to Know

**The Problem:**
GitHub updated their security in September 2025 to protect your code
from a future threat. Hackers could theoretically record your SSH
connections and store them. If quantum computers become powerful enough
(which experts expect in 10-20+ years), they could decrypt those old
recordings and access your data. This is called a "store now, decrypt
later" attack.

**The Solution:**
GitHub added a new, stronger type of encryption to SSH connections that
even quantum computers won't be able to break. It's a hybrid approach
that combines old, trusted methods with new quantum-resistant methods.

**What You Need to Do:**
This program will help you evaluate your system for safe Github access:

1. It will check your OpenSSH version: ssh -V
   - If it says 9.0 or newer: You're good. Nothing to do.
   - If it says 8.x or older: Update OpenSSH to version 9.0 or newer

2. It will verify you have the new algorithm available: ssh -Q kex
   - Look for sntrup761x25519-sha512 in the output
   - If it's there: ✓ You have quantum-safe protection
   - If it's not there: Update OpenSSH

3. It can (with your permission) also check your SSL certificates

The script will give recommendations about any action you should take
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --check-certificates)
            check_certificates=true
            shift
            ;;
        --reference)
            cat <<'EOF'
## GitHub SSH Quantum-Safe Change (September 2025)

**Algorithm:** `sntrup761x25519-sha512`
- Hybrid: Streamlined NTRU Prime (post-quantum) + X25519 (classical)
- Protects against "store now, decrypt later" attacks from future quantum computers

**Rollout:**
- September 17, 2025 on GitHub.com and GitHub Enterprise Cloud
- Excluded US region (requires FIPS-approved cryptography)
- Included in GitHub Enterprise Server 3.19

**Requirements:**
- OpenSSH 9.0+ (automatic support)
- Older clients fall back gracefully to existing algorithms

**What You Need to Do:**
Most users: nothing. Just verify with `ssh -Q kex` that you see the post-quantum algorithms.

**See:** https://github.blog/engineering/platform-security/post-quantum-security-for-ssh-access-on-github/
EOF
            exit 0
            ;;
        --intro)
            print_intro
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--check-certificates] [--reference] [--summary]"
            exit 1
            ;;
    esac
done

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track findings
has_post_quantum=false
openssh_version=""
openssh_major=""
openssh_minor=""
post_quantum_algos=()
key_types=()
issues=()
recommendations=()

# Function to check OpenSSH version
check_openssh_version() {
    echo -e "${BLUE}1. OpenSSH Version${NC}"
    local openssh_full=$(ssh -V 2>&1)
    echo "   $openssh_full"

    openssh_version=$(echo "$openssh_full" | grep -oE 'OpenSSH_[0-9.]+' | grep -oE '[0-9.]+' | head -1)
    openssh_major=$(echo "$openssh_version" | cut -d. -f1)
    openssh_minor=$(echo "$openssh_version" | cut -d. -f2)

    if [[ $openssh_major -gt 9 ]] || [[ $openssh_major -eq 9 && $openssh_minor -ge 0 ]]; then
        echo -e "   ${GREEN}✓ OpenSSH $openssh_version supports post-quantum algorithms${NC}"
        has_post_quantum=true
    else
        echo -e "   ${RED}✗ OpenSSH $openssh_version is too old (9.0+ required)${NC}"
        issues+=("OpenSSH version $openssh_version does not support post-quantum algorithms")
        recommendations+=("Upgrade to OpenSSH 9.0 or newer")
    fi

    echo ""
}

# Function to check available key exchange algorithms
check_kex_algorithms() {
    echo -e "${BLUE}2. Available Key Exchange Algorithms${NC}"
    local all_kex=$(ssh -Q kex)

    # Check for post-quantum algorithms
    if echo "$all_kex" | grep -q "sntrup761x25519-sha512"; then
        post_quantum_algos+=("sntrup761x25519-sha512")
        echo -e "   ${GREEN}✓ sntrup761x25519-sha512 (NTRU Prime hybrid)${NC}"
    fi

    if echo "$all_kex" | grep -q "mlkem768x25519-sha256"; then
        post_quantum_algos+=("mlkem768x25519-sha256")
        echo -e "   ${GREEN}✓ mlkem768x25519-sha256 (ML-KEM hybrid)${NC}"
    fi

    if [[ ${#post_quantum_algos[@]} -eq 0 ]]; then
        echo -e "   ${RED}✗ No post-quantum key exchange algorithms found${NC}"
        issues+=("No post-quantum key exchange algorithms available")
        recommendations+=("Upgrade OpenSSH to 9.0 or newer")
    else
        echo -e "   ${GREEN}✓ Found ${#post_quantum_algos[@]} post-quantum algorithm(s)${NC}"
    fi

    echo ""
}

# Function to run interview mode
run_interview() {
    echo -e "${BLUE}=== SSH Quantum Safety Evaluation ===${NC}\n"

    echo -e "${BLUE}"
    PMT="Let's start with an introduction to this tool [ENTER]:"
    read -p "$PMT"
    echo -e "${NC}"
    print_intro
    echo ""

    echo -e "${BLUE}"
    PMT="Let's check your ssh version [ENTER]:"
    read -p "$PMT"
    echo -e "${NC}"
    check_openssh_version
    echo ""

    echo -e "${BLUE}"
    PMT="Let's check your ssh algorithms [ENTER]:"
    read -p "$PMT"
    echo -e "${NC}"
    check_kex_algorithms
    echo ""

    echo -e "${BLUE}"
    PMT="Review summary of your test results [ENTER]:"
    read -p "$PMT"
    echo -e "${NC}"
    echo ""
}

# Function to check local SSH key types
check_ssh_keys() {
    echo -e "${BLUE}3. Local SSH Key Types${NC}"

    if [[ ! -d ~/.ssh ]]; then
        echo -e "   ${YELLOW}⚠ No ~/.ssh directory found${NC}"
        recommendations+=("Generate SSH keys if needed")
    else
        key_count=0
        has_weak_keys=false
        has_modern_keys=false

        for keyfile in ~/.ssh/*.pub; do
            if [[ ! -f "$keyfile" ]]; then
                continue
            fi

            key_count=$((key_count + 1))
            key_type=$(ssh-keygen -l -f "$keyfile" 2>/dev/null | awk '{print $NF}' | tr -d '()')
            key_name=$(basename "$keyfile")

            case "$key_type" in
                ED25519)
                    echo -e "   ${GREEN}✓ $key_name: ED25519 (excellent)${NC}"
                    has_modern_keys=true
                    key_types+=("ED25519")
                    ;;
                ECDSA)
                    echo -e "   ${GREEN}✓ $key_name: ECDSA (good)${NC}"
                    has_modern_keys=true
                    key_types+=("ECDSA")
                    ;;
                RSA)
                    # Check RSA key size
                    key_bits=$(ssh-keygen -l -f "$keyfile" 2>/dev/null | awk '{print $1}')
                    if [[ $key_bits -ge 2048 ]]; then
                        echo -e "   ${YELLOW}⚠ $key_name: RSA-$key_bits (acceptable but older)${NC}"
                        key_types+=("RSA-$key_bits")
                    else
                        echo -e "   ${RED}✗ $key_name: RSA-$key_bits (too weak, minimum 2048)${NC}"
                        has_weak_keys=true
                        issues+=("RSA key $key_name is less than 2048 bits")
                    fi
                    ;;
                DSA|ssh-dss)
                    echo -e "   ${RED}✗ $key_name: DSA (DEPRECATED by GitHub)${NC}"
                    has_weak_keys=true
                    issues+=("DSA key $key_name is deprecated and cannot be used with GitHub")
                    recommendations+=("Replace $key_name with ED25519 or ECDSA key")
                    ;;
                *)
                    echo -e "   ${YELLOW}⚠ $key_name: Unknown type ($key_type)${NC}"
                    ;;
            esac
        done

        if [[ $key_count -eq 0 ]]; then
            echo -e "   ${YELLOW}⚠ No SSH public keys found in ~/.ssh${NC}"
            recommendations+=("Generate SSH keys: ssh-keygen -t ed25519 -C 'your_email@example.com'")
        fi
    fi

    echo ""
}

# Run interview first
run_interview

# Call function only if --check-certificates flag was passed
if [[ $check_certificates == true ]]; then
    check_ssh_keys
else
    echo -e "${BLUE}3. Local SSH Key Types${NC}"
    echo -e "   ${YELLOW}⚠ Not checked (use --check-certificates to enable)${NC}"
    echo ""
fi

# 4. Summary and recommendations
echo -e "${BLUE}Quantum Safety Assessment${NC}"

if [[ ${#issues[@]} -eq 0 ]]; then
    echo -e "   ${GREEN}✓ Full post-quantum safety compliance${NC}"
    echo -e "   ${GREEN}✓ Your SSH setup meets GitHub 2025 guidelines${NC}"
    safety_level="FULL"
elif [[ $has_post_quantum == true ]]; then
    echo -e "   ${YELLOW}⚠ Partial post-quantum safety${NC}"
    echo -e "   ${YELLOW}Your system supports post-quantum algorithms, but has some issues${NC}"
    safety_level="PARTIAL"
else
    echo -e "   ${RED}✗ No post-quantum safety${NC}"
    safety_level="NONE"
fi

echo ""
echo -e "${BLUE}5. Recommendations${NC}"

if [[ ${#recommendations[@]} -eq 0 ]]; then
    echo -e "   ${GREEN}✓ No action required${NC}"
else
    for ((i=0; i<${#recommendations[@]}; i++)); do
        echo -e "   $((i+1)). ${recommendations[$i]}"
    done
fi

echo ""
echo -e "${BLUE}=== Summary ===${NC}"
echo "OpenSSH Version:         $openssh_version"
echo "Post-Quantum Algorithms: ${#post_quantum_algos[@]} available"
echo "Safety Level:            $safety_level"
echo ""

if [[ ${#issues[@]} -gt 0 ]]; then
    echo -e "${RED}Issues Found:${NC}"
    for ((i=0; i<${#issues[@]}; i++)); do
        echo -e "   $((i+1)). ${issues[$i]}"
    done
    echo ""
fi

if [[ ${#issues[@]} -eq 0 ]]; then
    exit 0
else
    exit 1
fi
