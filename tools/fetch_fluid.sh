inst=$1; lo=$2; hi=$3
mkdir -p $inst
for oct in $(seq 0 8); do for n in A C Eb Gb; do
  case $n in A) s=9;; C) s=0;; Eb) s=3;; Gb) s=6;; esac
  m=$(( (oct+1)*12 + s )); [ $m -lt $lo ] && continue; [ $m -gt $hi ] && continue
  f="$inst/$n$oct.mp3"; [ -s "$f" ] && continue
  curl -sS -f --max-time 20 -o "$f" "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/$inst-mp3/$n$oct.mp3" || rm -f "$f"
done; done
echo "$inst $(ls $inst | wc -l) $(du -sh $inst | cut -f1)"
