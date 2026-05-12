using UnityEngine;

public class Body : MonoBehaviour
{
    public class AvatarTree
    {
        public Transform transf;
        public AvatarTree child;
        public AvatarTree parent;
        public int idx;
        public Quaternion quaternion;

        public AvatarTree(Transform tf, int idx, Quaternion quaternion, AvatarTree parent = null)
        {
            this.transf = tf;
            this.parent = parent;
            this.idx = idx;
            this.quaternion = quaternion;
        }

        public Vector3 GetDir()
        {
            if (parent != null)
            {
                return transf.position - parent.transf.position;
            }
            return Vector3.up;
        }
    }

    public Animator anim;
    public Transform hip;
    public Transform spine;
    public Transform thorax;
    public Transform neck;
    public Transform head;
    public Transform nose;
    public Transform lHip;
    public Transform lKnee;
    public Transform lFoot;
    public Transform rHip;
    public Transform rKnee;
    public Transform rFoot;
    public Transform lSld;
    public Transform lArm;
    public Transform lEblow;
    public Transform lWrist;
    public Transform rSld;
    public Transform rArm;
    public Transform rEblow;
    public Transform rWrist;

    public AvatarTree Hip;
    public AvatarTree LHip;
    private AvatarTree LKnee;
    private AvatarTree LFoot;
    public AvatarTree RHip;
    private AvatarTree RKnee;
    private AvatarTree RFoot;
    private AvatarTree Spine;
    private AvatarTree Thorax;
    private AvatarTree Neck;
    private AvatarTree Head;
    private AvatarTree Nose;
    public AvatarTree LSld;
    private AvatarTree LEblow;
    private AvatarTree LWrist;
    public AvatarTree RSld;
    private AvatarTree REblow;
    private AvatarTree RWrist;
    private AvatarTree LArm;
    private AvatarTree RArm;

    public float[][] pose_data;
    public float lerp;

    private void Start()
    {
        InitAvatar();
        BulidTree();
    }

    private void InitAvatar()
    {
        if (anim != null)
        {
            lHip = anim.GetBoneTransform(HumanBodyBones.LeftUpperLeg);
            lKnee = anim.GetBoneTransform(HumanBodyBones.LeftLowerLeg);
            lFoot = anim.GetBoneTransform(HumanBodyBones.LeftFoot);
            rHip = anim.GetBoneTransform(HumanBodyBones.RightUpperLeg);
            rKnee = anim.GetBoneTransform(HumanBodyBones.RightLowerLeg);
            rFoot = anim.GetBoneTransform(HumanBodyBones.RightFoot);
            spine = anim.GetBoneTransform(HumanBodyBones.Spine);
            thorax = anim.GetBoneTransform(HumanBodyBones.Chest);
            neck = anim.GetBoneTransform(HumanBodyBones.Neck);
            head = anim.GetBoneTransform(HumanBodyBones.Head);
            lSld = anim.GetBoneTransform(HumanBodyBones.LeftShoulder);
            lArm = anim.GetBoneTransform(HumanBodyBones.LeftUpperArm);
            lEblow = anim.GetBoneTransform(HumanBodyBones.LeftLowerArm);
            lWrist = anim.GetBoneTransform(HumanBodyBones.LeftHand);
            rSld = anim.GetBoneTransform(HumanBodyBones.RightShoulder);
            rArm = anim.GetBoneTransform(HumanBodyBones.RightUpperArm);
            rEblow = anim.GetBoneTransform(HumanBodyBones.RightLowerArm);
            rWrist = anim.GetBoneTransform(HumanBodyBones.RightHand);
        }
    }

    private void BulidTree()
    {
        Hip = new AvatarTree(hip, -1, hip.rotation);
        Spine = Hip.child = new AvatarTree(spine, -2, spine.rotation, Hip);
        Thorax = Spine.child = new AvatarTree(thorax, -3, thorax.rotation, Spine);
        Neck = Thorax.child = new AvatarTree(neck, -4, neck.rotation, Thorax);
        Head = Neck.child = new AvatarTree(head, -5, head.rotation, Neck);
        Nose = Head.child = new AvatarTree(nose, 0, nose.rotation, Head);
        LHip = new AvatarTree(lHip, 23, lHip.rotation);
        LKnee = LHip.child = new AvatarTree(lKnee, 25, lKnee.rotation, LHip);
        LFoot = LKnee.child = new AvatarTree(lFoot, 29, lFoot.rotation, LKnee);
        RHip = new AvatarTree(rHip, 24, rHip.rotation);
        RKnee = RHip.child = new AvatarTree(rKnee, 26, rHip.rotation, RHip);
        RFoot = RKnee.child = new AvatarTree(rFoot, 30, rFoot.rotation, RKnee);
        LSld = new AvatarTree(lSld, -6, lSld.rotation);
        LArm = LSld.child = new AvatarTree(lArm, 11, lArm.rotation, LSld);
        LEblow = LArm.child = new AvatarTree(lEblow, 13, lEblow.rotation, LArm);
        LWrist = LEblow.child = new AvatarTree(lWrist, 15, lWrist.rotation, LEblow);
        RSld = new AvatarTree(rSld, -7, rSld.rotation);
        RArm = RSld.child = new AvatarTree(rArm, 12, rArm.rotation, RSld);
        REblow = RArm.child = new AvatarTree(rEblow, 14, rEblow.rotation, RArm);
        RWrist = REblow.child = new AvatarTree(rWrist, 16, rWrist.rotation, REblow);
    }

    void Update()
    {
        float rotationSpeed = 3.0f;
        float t = rotationSpeed * Time.deltaTime;

        if (pose_data != null && pose_data.Length > 0)
        {
            UpdateTree(Hip, t);
            UpdateTree(RArm, t);
            UpdateTree(LArm, t);
        }
    }

    private Vector3 GetData(int idx)
    {
        float x;
        float y;
        float z;

        if (idx == -1)
        {
            x = (pose_data[23][0] + pose_data[24][0]) / 2;
            y = (pose_data[23][1] + pose_data[24][1]) / 2;
            z = (pose_data[23][2] + pose_data[24][2]) / 2;
        }
        else if (idx == -2)
        {
            x = ((pose_data[11][0] + pose_data[12][0]) / 2 + (pose_data[23][0] + pose_data[24][0]) / 2) / 2;
            y = ((pose_data[11][1] + pose_data[12][1]) / 2 + (pose_data[23][1] + pose_data[24][1]) / 2) / 2;
            z = ((pose_data[11][2] + pose_data[12][2]) / 2 + (pose_data[23][2] + pose_data[24][2]) / 2) / 2;
        }
        else if (idx == -3)
        {
            x = (pose_data[11][0] + pose_data[12][0]) / 2;
            y = (pose_data[11][1] + pose_data[12][1]) / 2;
            z = (pose_data[11][2] + pose_data[12][2]) / 2;
        }
        else if (idx == -4)
        {
            x = ((pose_data[8][0] + pose_data[7][0]) / 2 + (pose_data[11][0] + pose_data[12][0]) / 2) / 2;
            y = ((pose_data[8][1] + pose_data[7][1]) / 2 + (pose_data[11][1] + pose_data[12][1]) / 2) / 2;
            z = ((pose_data[8][2] + pose_data[7][2]) / 2 + (pose_data[11][2] + pose_data[12][2]) / 2) / 2;
        }
        else if (idx == -5)
        {
            x = (pose_data[8][0] + pose_data[7][0]) / 2;
            y = (pose_data[8][1] + pose_data[7][1]) / 2;
            z = (pose_data[8][2] + pose_data[7][2]) / 2;
        }
        else if (idx == -6)
        {
            x = (pose_data[11][0] * 3 + pose_data[12][0]) / 4;
            y = (pose_data[11][1] * 3 + pose_data[12][1]) / 4;
            z = (pose_data[11][2] * 3 + pose_data[12][2]) / 4;
        }
        else if (idx == -7)
        {
            x = (pose_data[11][0] + pose_data[12][0] * 3) / 4;
            y = (pose_data[11][1] + pose_data[12][1] * 3) / 4;
            z = (pose_data[11][2] + pose_data[12][2] * 3) / 4;
        }
        else
        {
            if (idx >= 0 && idx < pose_data.Length)
            {
                x = pose_data[idx][0];
                y = pose_data[idx][1];
                z = pose_data[idx][2];
            }
            else
            {
                Debug.LogWarning($"Index {idx} is out of bounds for pose_data array.");
                x = y = z = 0;
            }
        }

        return new Vector3(-x, y, -z);
    }

    private void UpdateTree(AvatarTree tree, float blend)
    {
        if (tree.parent != null)
        {
            UpdateBone(tree, blend);
        }
        if (tree.child != null)
        {
            UpdateTree(tree.child, blend);
        }
    }

    private void UpdateBone(AvatarTree tree, float blend)
    {
        Vector3 dir1 = tree.GetDir();
        Vector3 dir2 = GetData(tree.parent.idx) - GetData(tree.idx);
        Quaternion rot = Quaternion.FromToRotation(dir1, dir2);
        Quaternion rot1 = tree.parent.transf.rotation;
        tree.parent.transf.rotation = Quaternion.Lerp(rot1, rot * rot1, blend);
    }

    public void ResetPose()
    {
        ResetTree(Hip);
        ResetTree(LHip);
        ResetTree(RHip);
        ResetTree(LSld);
        ResetTree(RSld);
    }

    private void ResetTree(AvatarTree tree)
    {
        if (tree == null || tree.transf == null)
        {
            return;
        }

        tree.transf.rotation = tree.quaternion;
        if (tree.child != null)
        {
            ResetTree(tree.child);
        }
    }
}
