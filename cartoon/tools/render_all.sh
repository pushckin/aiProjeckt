#!/bin/bash
# две очереди рендера параллельно
cd "$(dirname "$0")/.."
q() { for p in "$@"; do k=${p%%_*}; FPS=30 node tools/step-render.cjs render/$k.mp4 scenes/$p.html > render/$k.log 2>&1; done; }
q p1_hangar p3_corridor p5_credits &
q p0_title p2_perimeter p4_finale &
wait; echo ALLDONE
