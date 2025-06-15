using Microsoft.Maui.Graphics.Platform;
using Microsoft.Maui.Storage;
using Microsoft.UI.Xaml.Media.Imaging;
using System.ComponentModel;
using System.Reflection;

namespace MapViewerTools
{
    public class GraphicsDrawable : IDrawable
    {
        public async void Draw(ICanvas canvas, RectF dirtyRect)
        {
            
            try
            {
                
                var pickOptions = new PickOptions
                {
                    FileTypes = FilePickerFileType.Images
                };
                
                var imgFile = await FilePicker.Default.PickAsync(pickOptions);
                canvas.StrokeColor = Colors.Red;
                canvas.StrokeSize = 6;
                canvas.DrawLine(10, 10, 90, 100);
                if (imgFile == null)
                {
                    //await DisplayAlert("Error", "No image file picked", "OK");
                    return;
                }

                Microsoft.Maui.Graphics.IImage image;

                using (Stream stream = await imgFile.OpenReadAsync())
                {
                    image = PlatformImage.FromStream(stream);
                }

                if (image != null)
                {
                    //canvas.DrawImage(image, 0, 0, image.Width, image.Height);
                    

                }
                
            }
            catch (Exception ex)
            {
                // Log the exception (use your preferred logging mechanism)
                //System.Diagnostics.Debug.WriteLine($"An error occurred: {ex.Message}");
                // Optionally, you can display an alert to the user
                await Application.Current.MainPage.DisplayAlert("Error", ex.Message, "OK");
            }
            

        }
    }
    public partial class MainPage : ContentPage
    {
        public MainPage()
        {
            InitializeComponent();
        }
    }
}
        //        Microsoft.Maui.Graphics.IImage image;
        // Assembly assembly = GetType().GetTypeInfo().Assembly;

        //private async void OpenFile(object sender, EventArgs e)
        //{
        //return;
        //    }

    //    //IsBusy = true;



    //    try
    //    {
    //        using (Stream stream = await imgFileTemp.OpenReadAsync())
    //        {
    //            var imageSource = ImageSource.FromStream(() => stream);
    //            //MainThread.BeginInvokeOnMainThread(() =>
    //            //{
    //            displayImg.Source = imageSource;
    //            displayImg.HeightRequest = 500;
    //            displayImg.WidthRequest = 500;

    //            //});
    //        }
    //    }
    //    catch (Exception ex)
    //    {
    //        // Handle exceptions (e.g., file read errors, stream errors)
    //        await DisplayAlert("Error", $"Failed to load image: {ex.Message}", "OK");
    //    }

    //    //IsBusy = false;
    //}



    //private FileResult? imgFile = null;
    ////private FileResult currentFile;












    ////private async Task LoadcurrentFileAsync(FileResult currentFileTemp)
    ////{
    ////    currentFile = currentFileTemp;

    ////    if (currentFile == null)
    ////    {
    ////        throw new ArgumentNullException(nameof(currentFile));
    ////    }

    ////    using (Stream stream = await currentFile.OpenReadAsync())
    ////    {
    ////        using (var reader = new StreamReader(stream))
    ////        {
    ////            string inkData = await reader.ReadToEndAsync();
    ////            // Load ink data into inkCanvas
    ////        }
    ////    }
    ////}

    ////private async Task SavecurrentFileAsync()
    ////{
    ////    if (imgFile == null)
    ////    {
    ////        await DisplayAlert("Error", "Nothing to save", "OK");
    ////        return;
    ////    }

    ////    var result = await FilePicker.Default.PickAsync(new PickOptions
    ////    {
    ////        //SuggestedStartLocation = PickerLocationId.DocumentsLibrary,
    ////        FileTypes = new FilePickerFileType(new Dictionary<DevicePlatform, IEnumerable<string>>
    ////        {
    ////            { DevicePlatform.iOS, new[] { "public.data" } },
    ////            { DevicePlatform.Android, new[] { "application/octet-stream" } },
    ////            { DevicePlatform.WinUI, new[] { ".mapink" } },
    ////            { DevicePlatform.MacCatalyst, new[] { "public.data" } }
    ////        }),
    ////        //SuggestedFileName = "MapInked_" + Path.GetFileNameWithoutExtension(imgFile.FileName)
    ////    });

    ////    if (result == null)
    ////    {
    ////        await DisplayAlert("Error", "No save file selected", "OK");
    ////        return;
    ////    }

    ////    string filePath = result.FullPath;
    ////    using (Stream stream = File.OpenWrite(filePath))
    ////    {
    ////        using (var writer = new StreamWriter(stream))
    ////        {
    ////            await writer.WriteAsync("Your ink data"); // Replace with actual ink data to be saved
    ////        }
    ////    }

    ////    currentFile = result;
    ////}




    //    //bool pickInk = await DisplayAlert("Ink File", "Do you want to pick an ink file?", "Yes", "No");
    //    //if (pickInk)
    //    //{
    //    //    var inkFileResult = await PickFileAsync("Open Ink File", new FilePickerFileType(new Dictionary<DevicePlatform, IEnumerable<string>>
    //    //    {
    //    //        { DevicePlatform.iOS, new[] { "public.data" } },
    //    //        { DevicePlatform.Android, new[] { "application/octet-stream" } },
    //    //        { DevicePlatform.WinUI, new[] { ".mapink" } },
    //    //        { DevicePlatform.MacCatalyst, new[] { "public.data" } }
    //    //    }));

    //    //    if (inkFileResult == null)
    //    //    {
    //    //        await DisplayAlert("Error", "No ink file picked", "OK");
    //    //        return;
    //    //    }

    //    //    await LoadInkFileAsync(inkFileResult);
    //    //}





    //private async void SavecurrentFile(object sender, EventArgs e)
    //{
    //    await SavecurrentFileAsync();
    //}

