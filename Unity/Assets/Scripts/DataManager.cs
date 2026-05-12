// using System.Net;
// using System.Text;
// using System.Net.Sockets;
// using System.Threading;
// using UnityEngine;
// using System;

// /// <summary>
// /// ���ݹ��������ջ�Python�˵�����
// /// </summary>
// public class DataManager : MonoBehaviour
// {
//     /// <summary>
//     /// 
//     /// </summary>
//     public Body body;
//     public Hand hand;
//     Thread receiveThread;
//     UdpClient client;
//     public int port = 5054;
//     public string[] data;

//     void Start()
//     {
//         //����Socket�ջ�����
//         receiveThread = new Thread(new ThreadStart(ReceiveData));
//         receiveThread.IsBackground = true;
//         receiveThread.Start();
//     }

//     private void ReceiveData()
//     {
//         client = new UdpClient(port);
//         while (true)
//         {
//             try
//             {
//                 //�����������ݸ�������ֲ�
//                 IPEndPoint anyIP = new IPEndPoint(IPAddress.Any, 0);
//                 byte[] dataByte = client.Receive(ref anyIP);
//                 data = Encoding.UTF8.GetString(dataByte).Split(';');
//                 hand.data = data[0];
//                 body.data = data[1];
//             }
//             catch (Exception e)
//             {
//                 Debug.Log(e);
//             }
//         }
//     }//��������

//     void Update()
//     {

//     }
// }

using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

#if !UNITY_WEBGL || UNITY_EDITOR
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
#endif

[Serializable]
public class Landmark
{
    public float x;
    public float y;
    public float z;
}

[Serializable]
public class LandmarkPacket
{
    public List<Landmark> left_hand;
    public List<Landmark> right_hand;
    public List<Landmark> pose;
}

public class DataManager : MonoBehaviour
{
    public Body body;
    public Hand hand;

#if !UNITY_WEBGL || UNITY_EDITOR
    Thread receiveThread;
    UdpClient client;
#endif

    public int port = 5054;
    public string receivedData;

    void Start()
    {
#if !UNITY_WEBGL || UNITY_EDITOR
        receiveThread = new Thread(new ThreadStart(ReceiveData));
        receiveThread.IsBackground = true;
        receiveThread.Start();
#else
        Debug.Log("DataManager running in WebGL mode. Waiting for browser-driven frame updates.");
#endif
    }

#if !UNITY_WEBGL || UNITY_EDITOR
    private void ReceiveData()
    {
        client = new UdpClient(port);
        while (true)
        {
            try
            {
                IPEndPoint anyIP = new IPEndPoint(IPAddress.Any, 0);
                byte[] dataByte = client.Receive(ref anyIP);
                ApplyFramePayload(Encoding.UTF8.GetString(dataByte));
            }
            catch (Exception e)
            {
                Debug.LogError($"Error receiving or parsing data: {e.Message}\nReceived Data: {receivedData}");
            }
        }
    }
#endif

    public void ReceiveFrameJson(string rawPayload)
    {
        ApplyFramePayload(rawPayload);
    }

    public void ClearFrame()
    {
        receivedData = string.Empty;
        if (hand != null)
        {
            hand.left_hand_data = null;
            hand.right_hand_data = null;
            hand.ResetPose();
        }

        if (body != null)
        {
            body.pose_data = null;
            body.ResetPose();
        }
    }

    private void ApplyFramePayload(string rawPayload)
    {
        receivedData = SanitizePayload(rawPayload);
        if (string.IsNullOrWhiteSpace(receivedData))
        {
            ClearFrame();
            return;
        }

        try
        {
            LandmarkPacket payload = JsonUtility.FromJson<LandmarkPacket>(receivedData);
            if (payload == null)
            {
                throw new InvalidOperationException("Parsed landmark payload was null.");
            }

            if (hand != null)
            {
                hand.left_hand_data = ConvertLandmarks(payload.left_hand);
                hand.right_hand_data = ConvertLandmarks(payload.right_hand);
            }

            if (body != null)
            {
                body.pose_data = ConvertLandmarks(payload.pose);
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"Error parsing landmark payload: {e.Message}\nReceived Data: {receivedData}");
        }
    }

    private static string SanitizePayload(string rawPayload)
    {
        if (string.IsNullOrWhiteSpace(rawPayload))
        {
            return string.Empty;
        }

        string payload = rawPayload.Trim();
        if (payload.EndsWith("<EOM>", StringComparison.Ordinal))
        {
            payload = payload.Substring(0, payload.Length - "<EOM>".Length).TrimEnd();
        }

        return payload;
    }

    private static float[][] ConvertLandmarks(List<Landmark> landmarks)
    {
        if (landmarks == null || landmarks.Count == 0)
        {
            return null;
        }

        return landmarks
            .Select(landmark => new[] { landmark.x, landmark.y, landmark.z })
            .ToArray();
    }

#if !UNITY_WEBGL || UNITY_EDITOR
    void OnApplicationQuit()
    {
        try
        {
            receiveThread?.Interrupt();
        }
        catch
        {
            // Ignore shutdown race conditions during quit.
        }

        client?.Close();
    }
#endif
}
