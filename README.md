# db-web-teleop

Web GUI allowing teleop to the Duckiebot from laptop.

### How to run

Put these files on the robot, then run from the robot:
```
python3 -m http.server [OPTIONAL PORT NUMBER]
```

On the laptop, navigate in browser (Chrome recommended) to `http://[ROBOT_HOSTNAME].local[:OPTIONAL_PORT_NUMBER]`

To set the limit(trim) for left and right wheel individually, use GET parameters as `?lim-left=[LIM_LEFT]&lim-right=[LIM_RIGHT]` (this goes after the above URL, where `[LIM_LEFT]` and `[LIM_RIGHT]` are values as percentage between 0-100.

#### Example URL

```
http://autobot01.local:12345/?lim-left=30&lim-right=4
```

This means the robot hostname is `autobot01`, the port is `12345`, and the limits for left and right motors are 0.3 and 0.04.


### Expected UI

* The top of the webpage should say which robot it's connected to.
* The middle row should contain a joystick window and 2 sliders.
  * The joystick can be controlled by `[W,A,S,D]` or `[UP,LEFT,DOWN,RIGHT]` arrow keys, or with mouse.
  * The sliders set the limit of left and right motors, and the default value is obtained from the GET parameters in the URL (see previous section)
* The bottom is a preview of the camera image stream.

Screenshot of UI as of commit 7fff7a1
![](https://polybox.ethz.ch/index.php/s/Z2VfjDywtkfvkyb/download)
