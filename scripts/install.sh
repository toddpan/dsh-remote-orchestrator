#!/usr/bin/env bash
# =============================================================================
# dsh-orchestrator（插件 + SKILL）一键在线安装脚本
#
# 用途：从 GitHub 在线安装 DSH 分布式编排套件：
#   1) @dsh-external/dsh-remote-orchestrator 插件（需 DSH 环境，可选安装）
#   2) dsh-orchestrator SKILL（让 AI 智能体掌握编排用法，默认安装）
#
# 一键安装 SKILL（任何机器）：
#   curl -fsSL https://raw.githubusercontent.com/toddpan/dsh-orchestrator/main/scripts/install.sh | bash
#
# 一键安装 SKILL + 插件（在装了 DSH 的机器上）：
#   curl -fsSL https://raw.githubusercontent.com/toddpan/dsh-orchestrator/main/scripts/install.sh | bash -s -- --all
#
# 仅安装插件：
#   curl -fsSL ... | bash -s -- --plugin
#
# 指定 SKILL 安装目录：
#   curl -fsSL ... | bash -s -- --dir ~/.dsh/skills
#
# 卸载（SKILL 与插件一起卸）：
#   curl -fsSL ... | bash -s -- uninstall
# =============================================================================
set -euo pipefail

REPO="toddpan/dsh-orchestrator"
BRANCH="${DSH_ORCHESTRATOR_BRANCH:-main}"
RAW_BASE="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
PLUGIN_NAME="@dsh-external/dsh-remote-orchestrator"
SKILL_NAME="dsh-orchestrator"
SKILL_TARGET="${HOME}/.dsh/skills"
MODE="install"
DO_PLUGIN=0
DO_ALL=0
NO_SKILL=0

# ---------- 参数解析 ----------
while [[ $# -gt 0 ]]; do
  case "$1" in
    uninstall)
      MODE="uninstall"
      shift
      ;;
    --all)
      DO_ALL=1
      DO_PLUGIN=1
      shift
      ;;
    --plugin)
      DO_PLUGIN=1
      NO_SKILL=1
      shift
      ;;
    --skill-only)
      shift
      ;;
    --dir)
      SKILL_TARGET="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      RAW_BASE="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
      shift 2
      ;;
    --repo)
      REPO="$2"
      RAW_BASE="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "未知参数: $1（用 --help 查看用法）" >&2
      exit 1
      ;;
  esac
done

fetch() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 --connect-timeout 10 -o "$2" "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -q --tries=3 --timeout=10 -O "$2" "$1"
  else
    echo "✗ 需要 curl 或 wget 之一来下载文件" >&2
    exit 1
  fi
}

install_skill() {
  local install_dir="${SKILL_TARGET%/}/${SKILL_NAME}"
  local skill_file="${install_dir}/SKILL.md"
  local tmp
  tmp="$(mktemp)"
  echo "── SKILL 安装 ──"
  echo "  目标: ${install_dir}"
  if ! fetch "${RAW_BASE}/skills/${SKILL_NAME}/SKILL.md" "${tmp}"; then
    echo "✗ 下载失败：${RAW_BASE}/skills/${SKILL_NAME}/SKILL.md" >&2
    rm -f "${tmp}"
    return 1
  fi
  if ! grep -q '^name:' "${tmp}" || ! grep -q '^description:' "${tmp}"; then
    echo "✗ 下载内容不是合法的 SKILL.md，已中止" >&2
    rm -f "${tmp}"
    return 1
  fi
  mkdir -p "${install_dir}"
  mv "${tmp}" "${skill_file}"
  echo "✓ SKILL.md 已安装: ${skill_file}"
}

uninstall_skill() {
  local install_dir="${SKILL_TARGET%/}/${SKILL_NAME}"
  if [[ -d "${install_dir}" ]]; then
    rm -rf "${install_dir}"
    echo "✓ 已卸载 SKILL: ${install_dir}"
  else
    echo "ℹ️ 未发现已安装的 SKILL: ${install_dir}"
  fi
}

# ---------- 插件安装（需要 DSH checkout / super-injector 环境） ----------
install_plugin() {
  echo "── 插件安装 ──"
  echo "  插件: ${PLUGIN_NAME}"

  # 1) 下载 Release tgz
  local tmp_tgz
  tmp_tgz="$(mktemp /tmp/dsh-orchestrator-XXXXXX.tgz)"
  local release_url="https://github.com/${REPO}/releases/latest/download/dsh-external-dsh-remote-orchestrator-0.0.1.tgz"
  echo "  下载: ${release_url}"
  if ! fetch "${release_url}" "${tmp_tgz}"; then
    # 回退：从源码构建
    echo "⚠️  Release 下载失败，回退为源码构建方式…"
    local workdir
    workdir="$(mktemp -d /tmp/dsh-orchestrator-src-XXXXXX)"
    if command -v git >/dev/null 2>&1; then
      git clone --depth 1 "https://github.com/${REPO}.git" "${workdir}" >/dev/null 2>&1 \
        || { echo "✗ git clone 失败" >&2; rm -rf "${workdir}"; return 1; }
      if bash "${workdir}/scripts/build.sh"; then
        echo "✓ 源码构建完成: ${workdir}"
        echo "ℹ️  请在 DSH 注入器环境执行: dev_inject_plugin {\"dir\": \"${workdir}\"}"
        echo "ℹ️  或使用 dev_install_package {\"dir\": \"${workdir}\"} 持久装配到 profile"
        rm -f "${tmp_tgz}"
        return 0
      fi
      rm -rf "${workdir}"
    fi
    rm -f "${tmp_tgz}"
    echo "✗ 插件自动安装失败，请手动按 README 构建" >&2
    return 1
  fi

  # 2) 优先尝试 dsh plugin CLI（DSH ≥ 支持 profile 的版本）
  local extracted
  extracted="$(mktemp -d /tmp/dsh-orchestrator-pkg-XXXXXX)"
  tar -xzf "${tmp_tgz}" -C "${extracted}" 2>/dev/null \
    || { echo "✗ tgz 解压失败" >&2; rm -rf "${extracted}" "${tmp_tgz}"; return 1; }
  local pkg_dir
  pkg_dir="$(find "${extracted}" -maxdepth 2 -name package.json | head -1 | xargs dirname 2>/dev/null || true)"

  if command -v dsh >/dev/null 2>&1 && [[ -n "${pkg_dir}" ]] && [[ -f "${pkg_dir}/lib/index.js" ]]; then
    if dsh plugin --profile web add "link:${pkg_dir}" >/dev/null 2>&1; then
      echo "✓ 插件已通过 'dsh plugin add' 装配（重启 dsh web 后生效）"
      rm -rf "${extracted}" "${tmp_tgz}"
      return 0
    fi
  fi

  # 3) 兜底：留下解压目录并给出注入指引
  echo "✓ 插件包已下载并解压: ${pkg_dir}"
  echo "ℹ️  未检测到可用的 'dsh plugin' CLI，请手动注入："
  echo "   dev_inject_plugin {\"dir\": \"${pkg_dir}\"}"
  echo "   dev_install_package {\"dir\": \"${pkg_dir}\"}   # 持久装配（重启后仍生效）"
  rm -f "${tmp_tgz}"
}

uninstall_plugin() {
  echo "── 插件卸载 ──"
  if command -v dsh >/dev/null 2>&1; then
    dsh plugin --profile web remove "${PLUGIN_NAME}" >/dev/null 2>&1 \
      && echo "✓ 已通过 'dsh plugin remove' 卸载" \
      || echo "ℹ️  'dsh plugin remove' 未成功（可能未用该方式安装）"
  fi
  echo "ℹ️  若是经注入器安装的，请在 DSH 环境执行: dev_uninject_plugin {\"match\": \"dsh-remote-orchestrator\"}"
}

echo "=== dsh-orchestrator 一键安装 (${MODE}) ==="

if [[ "${MODE}" == "uninstall" ]]; then
  uninstall_skill
  uninstall_plugin
  echo "完成。"
  exit 0
fi

FAILED=0

if [[ "${DO_PLUGIN}" == "1" ]]; then
  install_plugin || FAILED=1
fi

if [[ "${NO_SKILL}" == "0" ]]; then
  install_skill || FAILED=1
fi

# ---------- 探测本机编排服务 ----------
if command -v curl >/dev/null 2>&1; then
  if curl -fsS --connect-timeout 2 "http://127.0.0.1:3080/dsh-orchestrator/api/agents" >/dev/null 2>&1; then
    echo "✓ 检测到编排插件在线: http://127.0.0.1:3080/dsh-orchestrator"
  elif [[ "${DO_PLUGIN}" == "0" ]]; then
    echo "ℹ️  未检测到运行中的编排插件；如需安装请追加 --all 或 --plugin"
  fi
fi

if [[ "${FAILED}" == "1" ]]; then
  echo "⚠️  部分安装步骤失败，请查看上方日志。" >&2
  exit 1
fi

echo
echo "完成！"
echo "  - AI 智能体：会话中自动发现 '${SKILL_NAME}' SKILL，或用 /${SKILL_NAME} 直接调用"
echo "  - Web 控制台: http://127.0.0.1:3080/dsh-orchestrator"
echo "  - 卸载:      curl -fsSL ${RAW_BASE}/scripts/install.sh | bash -s -- uninstall"
