export PYENV_ROOT="/home/dev/.pyenv"
export PATH="$PYENV_ROOT/bin:$PYENV_ROOT/shims:$PATH"
command -v pyenv > /dev/null && eval "$(pyenv init -)"
