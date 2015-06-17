/**
 * @author fucture / http://fucture.org/
*/

/**
Copyright (c) 2015 fucture

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

THREE.FuctureKinectSkeletonHelper = function () {
    var fk = this;

    // public interface
    fk.getJoints = getJoints;
    fk.generateSkeleton = generateSkeleton;
    fk.updateSkeleton = updateSkeleton;
    fk.scale = 100;
    fk.debugAxisLength = 0.01;
    fk.cameraHeight = 0.735;

    // private properties, possibly could be made public
    var axisXGeometry = new THREE.Geometry();
    var axisYGeometry = new THREE.Geometry();
    var axisZGeometry = new THREE.Geometry();
    var boneGeometry = new THREE.Geometry();
    var jointGeometry = new THREE.Geometry();

    var axisXMat = new THREE.LineBasicMaterial({ color: 0xff0000, lineWidth: 1 });
    var axisYMat = new THREE.LineBasicMaterial({ color: 0x00ff00, lineWidth: 1 });
    var axisZMat = new THREE.LineBasicMaterial({ color: 0x0000ff, lineWidth: 1 });
    var boneMat = new THREE.LineBasicMaterial({ color: 0x00ffff, lineWidth: 10 });
    var jointMaterial = new THREE.PointCloudMaterial({ size: 10, sizeAttenuation: false, color: 0xffff00 });

    var joints = [];
    var jointNumberConstant;

    var jitterFilterCounters = [];
    for (var i = 0; i < 25; i++) {
        jitterFilterCounters.push(0);
    }

    var averagePos = [25];
    var averageBucketJointPositions = [];
    var averageBucketJointOrientations = [];
    for (var i = 0; i < 25; i++) {
        averageBucketJointPositions.push([]);
        averageBucketJointOrientations.push([]);
    }

    return fk;

    function getJoints(body, trackingState) {
        var jointInfo = {};

        Iterable.forEach(body.joints, jointIterator);
        function jointIterator(keyValuePair) {
            var jointType = keyValuePair.key;
            var joint = keyValuePair.value;
            var isTracked = joint.trackingState === trackingState.tracked;

            if (isTracked) {

                // simple jitter filter
                if (averageBucketJointPositions[jointType].length !== 10) {
                    averageBucketJointPositions[jointType].push(joint.position);
                } else {
                    averageBucketJointPositions[jointType].shift();
                    averageBucketJointPositions[jointType].push(joint.position);
                }

                var sumPosition = {x:0, y:0, z:0};
                for (var i = 0; i < averageBucketJointPositions[jointType].length; i++) {
                    sumPosition.x += averageBucketJointPositions[jointType][i].x;
                    sumPosition.y += averageBucketJointPositions[jointType][i].y;
                    sumPosition.z += averageBucketJointPositions[jointType][i].z;
                }
                sumPosition.x /= averageBucketJointPositions[jointType].length;
                sumPosition.y /= averageBucketJointPositions[jointType].length;
                sumPosition.z /= averageBucketJointPositions[jointType].length;

                jointInfo[jointType] = { position: sumPosition, jointType: joint.jointType };
            }
        }

        Iterable.forEach(body.jointOrientations, jointOrientationIterator);
        function jointOrientationIterator(keyValuePair) {
            var jointType = keyValuePair.key;
            var joint = keyValuePair.value;

            // simple jitter filter
            if (averageBucketJointOrientations[jointType].length !== 10) {
                averageBucketJointOrientations[jointType].push(joint.orientation);
            } else {
                averageBucketJointOrientations[jointType].shift();
                averageBucketJointOrientations[jointType].push(joint.orientation);
            }

            var sumOrientation = { x: 0, y: 0, z: 0, w: 0 };
            for (var i = 0; i < averageBucketJointOrientations[jointType].length; i++) {
                sumOrientation.x += averageBucketJointOrientations[jointType][i].x;
                sumOrientation.y += averageBucketJointOrientations[jointType][i].y;
                sumOrientation.z += averageBucketJointOrientations[jointType][i].z;
                sumOrientation.w += averageBucketJointOrientations[jointType][i].w;
            }
            sumOrientation.x /= averageBucketJointOrientations[jointType].length;
            sumOrientation.y /= averageBucketJointOrientations[jointType].length;
            sumOrientation.z /= averageBucketJointOrientations[jointType].length;
            sumOrientation.w /= averageBucketJointOrientations[jointType].length;

            if (jointInfo[jointType]) {
                jointInfo[jointType].orientation = sumOrientation;
            } else {
                jointInfo[jointType] = { orientation: sumOrientation };
            }
        }
        return jointInfo;
    }

    // scale 1000 means mm, scale 100 cm
    function generateSkeleton(scene, jointNumber, jointInfoForDrawing, scale, debugAxisLength) {
        fk.scale = scale;
        fk.debugAxisLength = debugAxisLength;
        fk.cameraHeight *= fk.scale;

        for (var i = 0; i < jointNumber; i++) {
            var joint = new THREE.Object3D();

            if (jointInfoForDrawing && jointInfoForDrawing[i]) {
                joint.position.x = jointInfoForDrawing[i].position.x * scale;
                joint.position.y = jointInfoForDrawing[i].position.z * scale;
                joint.position.z = jointInfoForDrawing[i].position.y * scale;
            }

            jointNumberConstant = jointNumber;

            joints.push(joint);
            scene.add(joint);
            jointGeometry.vertices.push(joint.position);

            var xPoint = new THREE.Vector3(debugAxisLength, 0, 0);
            xPoint.applyQuaternion(joints[i].quaternion);
            xPoint.add(joints[i].position);
            axisXGeometry.vertices.push(joint.position, xPoint);

            var yAxisMat = new THREE.LineBasicMaterial({ color: 0x0000ff, lineWidth: 1 });
            var yPoint = new THREE.Vector3(0, debugAxisLength, 0);
            yPoint.applyQuaternion(joints[i].quaternion);
            yPoint.add(joints[i].position);
            axisYGeometry.vertices.push(joint.position, yPoint);

            var zAxisMat = new THREE.LineBasicMaterial({ color: 0x00ff00, lineWidth: 1 });
            var zPoint = new THREE.Vector3(0, 0, debugAxisLength);
            zPoint.applyQuaternion(joints[i].quaternion);
            zPoint.add(joints[i].position);
            axisZGeometry.vertices.push(joint.position, zPoint);

            boneGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
        }

        var axisXLines = new THREE.Line(axisXGeometry, axisXMat, THREE.LinePieces);
        scene.add(axisXLines);
        var axisYLines = new THREE.Line(axisYGeometry, axisYMat, THREE.LinePieces);
        scene.add(axisYLines);
        var axisZLines = new THREE.Line(axisZGeometry, axisZMat, THREE.LinePieces);
        scene.add(axisZLines);

        var boneLines = new THREE.Line(boneGeometry, boneMat, THREE.LinePieces);
        scene.add(boneLines);

        var jointParticles = new THREE.PointCloud(jointGeometry, jointMaterial);
        scene.add(jointParticles);
    }

    function updateSkeleton(jointInfoForDrawing, jointType) {
        if (jointInfoForDrawing) {
            for (var j = 0; j < jointNumberConstant; j++) {
                if (jointInfoForDrawing && jointInfoForDrawing[j] && jointInfoForDrawing[j].position) {
                    joints[j].position.x = jointInfoForDrawing[j].position.x * fk.scale;
                    joints[j].position.y = jointInfoForDrawing[j].position.z * fk.scale;
                    joints[j].position.z = (jointInfoForDrawing[j].position.y + fk.cameraHeight / fk.scale) * fk.scale;
                }
                if (jointInfoForDrawing && jointInfoForDrawing[j] && jointInfoForDrawing[j].orientation) {
                    joints[j].quaternion.x = jointInfoForDrawing[j].orientation.x;
                    joints[j].quaternion.y = jointInfoForDrawing[j].orientation.y;
                    joints[j].quaternion.z = jointInfoForDrawing[j].orientation.z;
                    joints[j].quaternion.w = jointInfoForDrawing[j].orientation.w;
                }
                var xPoint = new THREE.Vector3(fk.debugAxisLength, 0, 0);
                xPoint.applyQuaternion(joints[j].quaternion);
                xPoint.add(joints[j].position);
                axisXGeometry.vertices[j * 2 + 0] = joints[j].position;
                axisXGeometry.vertices[j * 2 + 1] = xPoint;

                var yPoint = new THREE.Vector3(0, fk.debugAxisLength, 0);
                yPoint.applyQuaternion(joints[j].quaternion);
                yPoint.add(joints[j].position);
                axisYGeometry.vertices[j * 2 + 0] = joints[j].position;
                axisYGeometry.vertices[j * 2 + 1] = yPoint;

                var zPoint = new THREE.Vector3(0, 0, fk.debugAxisLength);
                zPoint.applyQuaternion(joints[j].quaternion);
                zPoint.add(joints[j].position);
                axisZGeometry.vertices[j * 2 + 0] = joints[j].position;
                axisZGeometry.vertices[j * 2 + 1] = zPoint;
            }

            updateBones(jointType);
        }

        jointGeometry.verticesNeedUpdate = true;
        axisXGeometry.verticesNeedUpdate = true;
        axisYGeometry.verticesNeedUpdate = true;
        axisZGeometry.verticesNeedUpdate = true;
        boneGeometry.verticesNeedUpdate = true;
    }

    function updateBones(jointType) {
        // left leg
        boneGeometry.vertices[0] = joints[jointType.footLeft].position;
        boneGeometry.vertices[1] = joints[jointType.ankleLeft].position;
                                          
        boneGeometry.vertices[2] = joints[jointType.ankleLeft].position;
        boneGeometry.vertices[3] = joints[jointType.kneeLeft].position;
                                          
        boneGeometry.vertices[4] = joints[jointType.kneeLeft].position;
        boneGeometry.vertices[5] = joints[jointType.hipLeft].position;
                                          
        boneGeometry.vertices[6] = joints[jointType.hipLeft].position;
        boneGeometry.vertices[7] = joints[jointType.spineBase].position;

        // right leg               
        boneGeometry.vertices[8] = joints[jointType.footRight].position;
        boneGeometry.vertices[9] = joints[jointType.ankleRight].position;

        boneGeometry.vertices[10] = joints[jointType.ankleRight].position;
        boneGeometry.vertices[11] = joints[jointType.kneeRight].position;
                                           
        boneGeometry.vertices[12] = joints[jointType.kneeRight].position;
        boneGeometry.vertices[13] = joints[jointType.hipRight].position;
                                           
        boneGeometry.vertices[14] = joints[jointType.hipRight].position;
        boneGeometry.vertices[15] = joints[jointType.spineBase].position;
                                           
        // spine - head                    
        boneGeometry.vertices[16] = joints[jointType.spineBase].position;
        boneGeometry.vertices[17] = joints[jointType.spineMid].position;
                                           
        boneGeometry.vertices[18] = joints[jointType.spineMid].position;
        boneGeometry.vertices[19] = joints[jointType.spineShoulder].position;
                                           
        boneGeometry.vertices[20] = joints[jointType.spineShoulder].position;
        boneGeometry.vertices[21] = joints[jointType.neck].position;
                                           
        boneGeometry.vertices[22] = joints[jointType.neck].position;
        boneGeometry.vertices[23] = joints[jointType.head].position;
                                           
        // right hand                      
        boneGeometry.vertices[24] = joints[jointType.handTipRight].position;
        boneGeometry.vertices[25] = joints[jointType.handRight].position;
                                           
        boneGeometry.vertices[26] = joints[jointType.thumbRight].position;
        boneGeometry.vertices[27] = joints[jointType.handRight].position;
                                           
        boneGeometry.vertices[28] = joints[jointType.handRight].position;
        boneGeometry.vertices[29] = joints[jointType.wristRight].position;
                                           
        boneGeometry.vertices[30] = joints[jointType.wristRight].position;
        boneGeometry.vertices[31] = joints[jointType.elbowRight].position;
                                           
        boneGeometry.vertices[32] = joints[jointType.elbowRight].position;
        boneGeometry.vertices[33] = joints[jointType.shoulderRight].position;
                                           
        boneGeometry.vertices[34] = joints[jointType.shoulderRight].position;
        boneGeometry.vertices[35] = joints[jointType.spineShoulder].position;
                                           
        // left hand                       
        boneGeometry.vertices[36] = joints[jointType.handTipLeft].position;
        boneGeometry.vertices[37] = joints[jointType.handLeft].position;
                                           
        boneGeometry.vertices[38] = joints[jointType.thumbLeft].position;
        boneGeometry.vertices[39] = joints[jointType.handLeft].position;
                                           
        boneGeometry.vertices[40] = joints[jointType.handLeft].position;
        boneGeometry.vertices[41] = joints[jointType.wristLeft].position;
                                           
        boneGeometry.vertices[42] = joints[jointType.wristLeft].position;
        boneGeometry.vertices[43] = joints[jointType.elbowLeft].position;
                                           
        boneGeometry.vertices[44] = joints[jointType.elbowLeft].position;
        boneGeometry.vertices[45] = joints[jointType.shoulderLeft].position;
                                           
        boneGeometry.vertices[46] = joints[jointType.shoulderLeft].position;
        boneGeometry.vertices[47] = joints[jointType.spineShoulder].position;
    }

};