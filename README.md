FuctureKinect is the small wrapper for Kinect v2 skeleton tracking in THREEJS. You get simple implementation of skeleton representation with some simple jitter filtering. This is not a stable release, so bugs can hunt you down, use this with caution. 

You can use it in javascript windows app like this:

// initialization of FuctureKinect
var fuctureKinect = new THREE.FuctureKinectSkeletonHelper();

// send body and trackingstate to get the joints for drawing
var jointInfoForDrawing = fuctureKinect.getJoints(bodies[i], nsKinect.TrackingState);

// initialization cycle of threejs
fuctureKinect.generateSkeleton(scene, constants.jointNumber, jointInfoForDrawing, 100, 10);

// update cycle of threejs
fuctureKinect.updateSkeleton(jointInfoForDrawing, nsKinect.JointType);