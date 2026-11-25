using System;
using System.Collections.Generic;
using NAudio.Dsp;
using NAudio.Wave;
using NAudio.Wave.SampleProviders;
public sealed class AudioFingerprint {
 readonly float[] ring=new float[2048];readonly float[] hann=new float[2048];readonly int[] edges=new int[34];readonly double[] previous=new double[32];
 readonly List<uint> hashes=new List<uint>();long count;bool havePrevious;
 public AudioFingerprint(){for(int n=0;n<hann.Length;n++)hann[n]=(float)(0.5-0.5*Math.Cos(2*Math.PI*n/(hann.Length-1)));for(int n=0;n<edges.Length;n++)edges[n]=(int)Math.Round(300*Math.Pow(3500.0/300,n/33.0)*2048/16000);}
 public void Add(float[] samples,int length){for(int n=0;n<length;n++){ring[count%2048]=samples[n];count++;if(count>=2048&&(count-2048)%256==0)Hash();}}
 void Hash(){
  var fft=new Complex[2048];for(int n=0;n<fft.Length;n++)fft[n].X=ring[(count+n)%2048]*hann[n];FastFourierTransform.FFT(true,11,fft);
  var bands=new double[33];for(int band=0;band<33;band++){double energy=0;for(int bin=edges[band];bin<edges[band+1];bin++)energy+=(double)fft[bin].X*fft[bin].X+(double)fft[bin].Y*fft[bin].Y;bands[band]=Math.Log(energy+1e-20);}
  uint hash=0;for(int n=0;n<32;n++){double value=bands[n]-bands[n+1];if(value-previous[n]>0)hash|=1U<<n;previous[n]=value;}if(havePrevious)hashes.Add(hash);havePrevious=true;
 }
 public uint[] Drain(){var value=hashes.ToArray();hashes.Clear();return value;}
 public static uint[] Wave(string path,float gain=1,int skipSamples=0){
  var fingerprint=new AudioFingerprint();using(var reader=new WaveFileReader(path)){
   ISampleProvider source=reader.ToSampleProvider();if(source.WaveFormat.Channels==2)source=new StereoToMonoSampleProvider(source){LeftVolume=0.5f,RightVolume=0.5f};
   if(source.WaveFormat.SampleRate!=16000)source=new WdlResamplingSampleProvider(source,16000);var samples=new float[3200];int count;
   while((count=source.Read(samples,0,samples.Length))>0){int skip=Math.Min(skipSamples,count);skipSamples-=skip;for(int n=skip;n<count;n++)samples[n-skip]=samples[n]*gain;fingerprint.Add(samples,count-skip);}
  }return fingerprint.Drain();
 }
 public static int Distance(uint a,uint b){uint v=a^b;v=v-((v>>1)&0x55555555);v=(v&0x33333333)+((v>>2)&0x33333333);return (int)((((v+(v>>4))&0x0F0F0F0F)*0x01010101)>>24);}
}
