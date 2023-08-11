const LeftRight = {
    Left: 0,
    Right: 1
}
//特許をとる予定の技術
const StereoScopicVideoDome = class {
    IPD = 0.032;
    FadeRatio = 2.0;//一秒
    LeftEyeLeftVideoDome;
    LeftEyeRightVideoDome;
    RightEyeLeftVideoDome;
    RightEyeRightVideoDome;
    deg2rad = (deg) => {
        deg * (Math.PI / 180)
    };
    rad2deg = (rad) => {
        rad * (180 / Math.PI)
    };
    clamp = (num, min, max) => {
        Math.min(Math.max(num, min), max)
    };
    scene;
    constructor(scene) {
        this.scene = scene;
    }
    CreateVideoDome(leftVideo, rightVideo) {
        // if (this.LeftEyeLeftVideoDome !== null) { this.LeftEyeLeftVideoDome.dispose(true, true); this.LeftEyeLeftVideoDome = null; }
        // if (this.LeftEyeRightVideoDome !== null) { this.LeftEyeRightVideoDome.dispose(true, true); this.LeftEyeRightVideoDome = null; }
        // if (this.RightEyeLeftVideoDome !== null) { this.RightEyeLeftVideoDome.dispose(true, true); this.RightEyeLeftVideoDome = null; }
        // if (this.RightEyeRightVideoDome !== null) { this.RightEyeRightVideoDome.dispose(true, true); this.RightEyeRightVideoDome = null; }
        this.LeftEyeLeftVideoDome = new BABYLON.VideoDome(
            'LeftEyeLeftVideoDome',
            leftVideo,
            {
                resolution: 64,
                // clickToPlay: true,
                autoPlay: true,
                size: 100,
                useDirectMapping: true
            },
            this.scene
        );
        this.LeftEyeRightVideoDome = new BABYLON.VideoDome(
            'LeftEyeRightVideoDome',
            rightVideo,
            {
                resolution: 64,
                // clickToPlay: true,
                autoPlay: true,
                size: 100,
                useDirectMapping: true
            },
            this.scene
        );
        this.RightEyeLeftVideoDome = new BABYLON.VideoDome(
            'RightEyeLeftVideoDome',
            leftVideo,
            {
                resolution: 64,
                // clickToPlay: true,
                autoPlay: true,
                size: 100,

                faceForward: true
            },
            this.scene
        );
        this.RightEyeRightVideoDome = new BABYLON.VideoDome(
            'RightEyeRightVideoDome',
            rightVideo,
            {
                resolution: 64,
                // clickToPlay: true,
                autoPlay: true,
                size: 100,

                faceForward: true
            },
            this.scene
        );
        this.LeftEyeLeftVideoDome.mesh.rotation = new BABYLON.Vector3(0, 90, 0);
        this.LeftEyeRightVideoDome.mesh.rotation = new BABYLON.Vector3(0, 90, 0);
        this.RightEyeLeftVideoDome.mesh.rotation = new BABYLON.Vector3(0, 90, 0);
        this.RightEyeRightVideoDome.mesh.rotation = new BABYLON.Vector3(0, 90, 0);
    }
    render(headRad, cameraDegree) {
        headRad %= 2*Math.PI;
        if(headRad>Math.PI)headRad -= 2*Math.PI;
        if(headRad<-Math.PI)headRad += 2*Math.PI;
        if (this.LeftEyeLeftVideoDome === null) return;
        if (this.LeftEyeRightVideoDome === null) return;
        if (this.RightEyeLeftVideoDome === null) return;
        if (this.RightEyeRightVideoDome === null) return;
        this.DomeRotate(cameraDegree);
        this.DomeFade(headRad, cameraDegree);
        //カメラ回転角修正
        let errorRad = StereoScopicVideoDome.CalcTwincamAngleError(cameraDegree, StereoScopicVideoDome.rad2deg(headRad));
        let deltarad = StereoScopicVideoDome.deg2rad(90);
        //errorDeg = 0;
        this.LeftEyeLeftVideoDome.mesh.rotation = new BABYLON.Vector3(0, deltarad, 0);
        this.LeftEyeRightVideoDome.mesh.rotation = new BABYLON.Vector3(0, deltarad + errorRad/2, 0);
        this.RightEyeLeftVideoDome.mesh.rotation = new BABYLON.Vector3(0, deltarad, 0);
        this.RightEyeRightVideoDome.mesh.rotation = new BABYLON.Vector3(0, deltarad + errorRad/2, 0);
    }
    //これによって，カメラが映り込まない映像の生成をしています
    DomeRotate(cameraRad) {//cameraRadはTwincamの角度
        let radian = cameraRad;
        var positionX = this.IPD * Math.cos(radian);
        var positionY = this.IPD * Math.sin(radian);
        if (this.LeftEyeLeftVideoDome == null) return;
        if (this.LeftEyeRightVideoDome == null) return;
        if (this.RightEyeLeftVideoDome == null) return;
        if (this.RightEyeRightVideoDome == null) return;
        this.LeftEyeLeftVideoDome.setAbsolutePosition(new BABYLON.Vector3(1000 - positionX, 0, -positionY));
        this.LeftEyeRightVideoDome.setAbsolutePosition(new BABYLON.Vector3(1000 + positionX, 0, positionY));
        this.RightEyeLeftVideoDome.setAbsolutePosition(new BABYLON.Vector3(1000 - positionX, 0, -positionY));
        this.RightEyeRightVideoDome.setAbsolutePosition(new BABYLON.Vector3(1000 + positionX, 0, positionY));
    }
    SetEyeRender(direction) {
        if (this.LeftEyeLeftVideoDome == null) return;
        if (this.LeftEyeRightVideoDome == null) return;
        if (this.RightEyeLeftVideoDome == null) return;
        if (this.RightEyeRightVideoDome == null) return;
        this.LeftEyeLeftVideoDome.setEnabled(direction == LeftRight.Left);
        this.LeftEyeRightVideoDome.setEnabled(direction == LeftRight.Left);
        this.RightEyeLeftVideoDome.setEnabled(direction == LeftRight.Right);
        this.RightEyeRightVideoDome.setEnabled(direction == LeftRight.Right);

    }
    DomeFade(headRad, cameraDegree) {
        // const cameraDegree = this.rad2deg(cameraRad);

        const headDegree = StereoScopicVideoDome.rad2deg(headRad);
       
        if (this.LeftEyeLeftVideoDome == null) return;
        if (this.LeftEyeRightVideoDome == null) return;
        if (this.RightEyeLeftVideoDome == null) return;
        if (this.RightEyeRightVideoDome == null) return;

        if (this.LeftEyeLeftVideoDome.material.alpha < 0.01) this.LeftEyeLeftVideoDome.mesh.visibility = 0;
        else this.LeftEyeLeftVideoDome.mesh.visibility = 1;
        if (this.LeftEyeRightVideoDome.material.alpha < 0.01) this.LeftEyeRightVideoDome.mesh.visibility = 0;
        else this.LeftEyeRightVideoDome.mesh.visibility = 1;
        if (this.RightEyeLeftVideoDome.material.alpha < 0.01) this.RightEyeLeftVideoDome.mesh.visibility = 0;
        else this.RightEyeLeftVideoDome.mesh.visibility = 1;
        if (this.RightEyeRightVideoDome.material.alpha < 0.01) this.RightEyeRightVideoDome.mesh.visibility = 0;
        else this.RightEyeRightVideoDome.mesh.visibility = 1;

        this.LeftEyeLeftVideoDome.material.alpha = this.DomeFadeAlpha(this.LeftEyeLeftVideoDome.material.alpha, headDegree, cameraDegree, LeftRight.Left, false);
        this.LeftEyeRightVideoDome.material.alpha = this.DomeFadeAlpha(this.LeftEyeRightVideoDome.material.alpha, headDegree, cameraDegree, LeftRight.Left, true);
        this.RightEyeLeftVideoDome.material.alpha = this.DomeFadeAlpha(this.RightEyeLeftVideoDome.material.alpha, headDegree, cameraDegree, LeftRight.Right, false);
        this.RightEyeRightVideoDome.material.alpha = this.DomeFadeAlpha(this.RightEyeRightVideoDome.material.alpha, headDegree, cameraDegree, LeftRight.Right, true);
    }
    //Theta映像球切り替えロジック
    DomeFadeAlpha(nowAlpha, headDegree, cameraDegree, direction, isReverse) {
        let Alpha = nowAlpha;
        let deltaTime = this.scene.deltaTime / 1000;
        if (isNaN(deltaTime)) return nowAlpha;
        let displayed = false;
        var d = headDegree - cameraDegree;
        if (d > 180) {
            d %= 180;
            d -= 180;
        }
        else if (d < -180) {
            d %= 180;
            d += 180;
        }
        let isShielding = StereoScopicVideoDome.ShieldingLimitDirection(headDegree, cameraDegree);
        if (direction == LeftRight.Left) {
            if (isReverse) {
                //d>45
                if (isShielding) {
                    displayed = true;
                }
                else {
                    displayed = false;
                }
            }
            else {
                //d>45
                if (isShielding) {
                    displayed = false;

                }
                else {
                    displayed = true;
                }
            }

        }
        else {
            if (isReverse) {
                //d<-45
                if (isShielding) {
                    displayed = false;
                }
                else {
                    displayed = true;
                }
            }
            else {
                //d<-45
                if (isShielding) {
                    displayed = true;
                }
                else {
                    displayed = false;
                }
            }
        }
        // if (displayed) Alpha += deltaTime * this.FadeRatio;
        // else Alpha -= deltaTime * this.FadeRatio;
        if(displayed)Alpha = 1.0;
        else Alpha = 0.0;
        //Alpha = this.clamp(Alpha, 0, 2);
       // Alpha = this.clamp(Alpha, 0.5, 0.51);
        return Alpha;
    }
    static CalcTwincamAngleError(ThetaM, PhiPe) {
        ThetaM = StereoScopicVideoDome.deg2rad(ThetaM);
        //ThetaM = 0;
        PhiPe = StereoScopicVideoDome.deg2rad(PhiPe);
        const IPD = 64;//64mm
        const focal_distance = 600;
        const Pe = new BABYLON.Vector2(focal_distance * Math.cos(PhiPe), focal_distance * Math.sin(PhiPe));
        const Or = new BABYLON.Vector2(Math.cos(ThetaM) * (IPD / 2), Math.sin(ThetaM) * (IPD / 2));
        const Ol = Or.multiplyByFloats(-1, -1);
        const Per = Pe.subtract(Or);
        const Pel = Pe.subtract(Ol);
        const PhiERR = Math.acos(BABYLON.Vector2.Dot(Per, Pel) / (Per.length() * Pel.length()));
        return PhiERR;
    }
    static ShieldingLimitDirection(ThetaM, PhiPe) {
        ThetaM = StereoScopicVideoDome.deg2rad(ThetaM);
        //ThetaM = 0;
        PhiPe = StereoScopicVideoDome.deg2rad(PhiPe);
        let pid = 64;
        let lE = (48 * 48 + 22 * 22) ^ 0.5;
        let b = lE / 2;
        let ThetaT = Math.atan(22 / 48);

        let gamma1 = ThetaM + ThetaT;
        let gamma2 = Math.PI - gamma1;
        let PhiK = Math.PI / 2 - ThetaT + Math.asin(pid * Math.sin(gamma2) / (pid ^ 2 + b ^ 2 - 2 * pid * b * Math.cos(gamma2)) ^ 0.5);
        return PhiK > (PhiPe - ThetaM);

    }
}