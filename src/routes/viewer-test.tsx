import { Title, useRouteData } from "solid-start";
import { createServerData$ } from "solid-start/server";
import { generateViewerCSS, generateViewerJS } from "~/lib/api/download/viewer-fixed";
import { createSignal, onMount } from "solid-js";

// Server function to generate test data
const useViewerData = createServerData$(async () => {
  // Generate mock data for testing
  const mockArchiveData = {
    metadata: {
      username: "test_user",
      exportDate: new Date().toISOString(),
      postCount: 10,
      mediaCount: 5,
      totalSize: 1024 * 1024 * 5 // 5MB
    },
    posts: Array(10).fill(null).map((_, index) => ({
      id: `post-${index}`,
      createdTime: Math.floor(Date.now() / 1000) - index * 86400, // One post per day, going back
      message: [{
        type: "text",
        text: `This is test post #${index} for viewer development with some emoji 🍑 📷 ❤️`
      }],
      media: index % 3 === 0 ? [{ // Every third post has media
        type: "image",
        url: "https://picsum.photos/500/300?random=" + index
      }] : [],
      commentCount: Math.floor(Math.random() * 5),
      likeCount: Math.floor(Math.random() * 10),
      isLiked: Math.random() > 0.5,
      localMediaPaths: index % 3 === 0 ? [`post_post-${index}_img_00.jpg`] : []
    }))
  };

  // Generate the CSS and JS for the viewer
  const cssContent = generateViewerCSS();
  const jsContent = generateViewerJS();
  
  // Stringify the archive data
  const archiveDataJson = JSON.stringify(mockArchiveData);
  
  // Base64 encoded Peach logo for offline use
  const peachLogoBase64 = `iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Jnjr0YfWSNImcIKuPIcSpE3ot2Yn7opza0opDaE6kfOzM8y1nM0M2K1uVs7+pdhfH1mkTMZaFvYfmRGb4C94V79fgvIa+huaW+HfrS/TL+0fuy57rHuW+BV4HvhjfBH8sf4R/Wb+2f71/sPBgYGjwUHB28NHh0cGbyPPJclWUljSWXJ5xk/Mk3KXvJn8n8UWBQsFB4UVxRvFm8VfxUclOyVbJX8VvxT8l8JQ0lDyU/Ja0lryW9ZQdlA2UO5QrlKuat8rzyr/LH8swSuhJ2EnUS7RLskv2S95LYUHiVK5SPlY+Xa5dfl3xXsFOgUTBQ2FTYVjistKr1QZleyU+KT8FE4VrhWuKfooDil+JXIV5RV3FRsV7yn+LWMpIymxKl0SNmv3FeCUaJTmpWKKDUrvVVGUc5SPlQ+VH5Svlb+pIKs4qlirnKocl7lXhVGVVA1TtVcdVP1RQ1ezUyNo9ah9kOdQJ1BPVE9Vb1K/bYGRsNGI1UjVaNS41UjW+OfxrLGkcZDTTrNQM04zUzNCc0HWkitIK1ErVKtK1qftNHaQdqJ2uXaN7RfzuHMccxJmVM5584c9Vy7udlzT8ztnvt5Hn6e37zEeSXzLs77Os9qXvy8knmd817NN58fPb94fs/8twsICzwXJC6oWHBrIXahx8LEhRULby/CLPJYlLSoatHdxYTFwYsLFjct/qKtr51MdEZhsqBnOVrZprOh06fTo0vSxeil6DXp9evT9cP0S/Rb9d8ZsBjEGZQbdBt8MzQ2jDM8bHjbiMiIbZRiVGt03xhj7G2cadxg/GIedV7UvP3zOuYTzFeZnzy/dv6gCckkwCTXpMXk42LjxXGLjy5+aCpsyjGtMO01wzfjmRWYdZj9NbcwTzCvNX9uQbMIschbaG1ywGK2RbFF48JXlpzFCywPWQ5YYaz8rHKt2q3+WJtZJ1s3WA/ZGNnE2VTbPF9CWhK25NBQ9h72Qfb59n32xPZe9nn2HQ4wB3eHHIdOh1+O1o5pji2OH5xMnBKdGpyGnI2c5zmfcH7sou2S4FLn8tJV0zXetd71NdvQPZ19xn2cm5fbbrcudzz3Re773O97UDwCPYo97nnSPKM8qz1feRl5LfRq8frsbePNdb/g/dnHzmePT6cvzJfrW+b71M/Aj+3X5Pfes1oXtdq0BrwDvIu975rTzOeYnzH/4GPtk+nT4QvxDfAt971vQbWIsmixeO/n7Jfrd8Mf4x/kf9j/SYBJACdgIBAK9A0sDewLYgSlBrUEwUGhQRVBz4L1g7nB3SHYkKUhjSEfQj1Di0MHFhguyF3QE0YOiw9rCvsS7hVeGj4YYR6RHdEVSYqMiayPfB/lEVUWNRRtE70r+kGMVgw7pjOWEBsTeyp2fKHXwvKFz+Ms4/Li7i3SWJK+6PpismXxy64toxKSEi4nEhLZiReTEEmRSS1JM8khyQ3JE2yf7GPsF4leiVWJr3O8cqpy3ub65Fblvi/wLagqGM/3zq/OH+P4cI5yJgtDCk8WTnIDuQ3cCUGQoEEwLnQXlgufi1xEVaLXxQHFNcXjJUElp0qmS0NLW0rR5ZHlnWUUYZKoa4X6ip0rBsvty4+ufLHKe9WJ1ZOrI1Z3rqGsyVjz61rjtSVr3/wR9EdHBbUiu+L+Osd1Vev+VA4tbauiVG2sGlrvt765Grs+ef39DXYbKje828jeeLvSuLK88uMm9qbbm402l2/+tGXplltVNlVVW/G1mbVP6/zqWrZRtxVsG9q+YHvbDuKO4h1vdsbtvF3vWN9QT9zN2/28Iaqhp9G6sbYJ18RtGtq9eHfPHrt9x/cS9xbtfdeS0HJvn+e+llZGa+l+xP7s/a/aYtoGDgQe6Gw3aK89SD5YeHDyEOfQyBH2kb4Oy47GoznHDnWiO4u7Jrrju0dOLDrR3+Pf09nr3Nt2Uv/kiZ/oP1We4pzad3r6dNHpyTN5Z8bPLjs7di7u3MOzEWcH+kL77vYv7O+/4HPh+sWFF69c8rx0+bLb5YtXOFfar3Kutp2zP9d63uZ8y8+2P7f02/a3XrC70HbR4WL7gOPAlUHXwWuXvC/duBy4+NsV/yt3rhKuDl5jX3t+Pfb68I2EG69uLr05dovxa3yb+jZ/h3yn+K7h3dO/Wf7WMuQw1DHsPXzrXsi9+/c59198kP1g4mH+I8KjkseGj+ueWD/5dcRrpHs0dPTh07SnE8+KfiP9VvPc7Pmvv7v/3j0WNjb0gvdi8mXRK8qr46+tX3eM+48/fJP5ZvJt8Tvy++ofzD90/uzz8/5kAuEOdnUjERsAZZwAwNOnAIyoHWDP2QwZz9kW/y/g7G3/P+FsnnP2jMXtgCfRAGBLHAAhahcpQO1s1C6JnASA60jL7Ovck2dLi85akPYdKqYE1/8Bu1vu5+oFGIUAAAAGYktHRAD/AP8A/6C9p5MAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfmBQgIGxSZCSQCAAAO30lEQVR42u1daXBV1RU+CQQMSICgQIhhMJCCQMGCVcpkQMCqg7iMow4oMC61IraDdYq2NWO1ZYodadVKq8Uq4AIqqOA4jsUIyKLIJgESkH0JWUgCWe77r//v9tyT84aE9+69byHk/GYy897NOeee8+13Ofe+xDBkM+dGf9WFAfQAMBTAvQCGN9XnBDAbQJnqYvRjBaOh7HoSgBkOD7+rqu48nP4/O+pYTzGnDwGcZb95APYVCfh4KFGoDwBkq5x7NIBpAD6Q0C8rAfQJJdEXAniqM7nYMCwFcH84Q7sNi0Pku6oA9Al1uXc3QLVAH+cD6BfO8PCRbUfjJtK9Q53nY0WGfK+sbuJ8Y7gHbZTIw3RgAFKqO/r6yLc+D6DASEDfmA8FgA8B8AmATdXVHU+KtbP9CSAM4MXqxjyJj/pTVVWH80qigQbCJPOTmm6IUqdAU4X58JiDAKwHcMhjd4sAHGA/0mupDRMKjKgc05sA3IiesFN0VFY2u9huZzciehpAtsf7egaAZXYn5QG/nfkpWexf5DFHX2YHn9iYVrRVWHzgSVXUBQwBkOSxU5UcPNqlvkXzaQ7eBgLI9TAQ5JLHAwCpqgY8gBEAFgNY47Xkf1dVdiLZ9w2PiWOZndMcRMlLGggjX+YmXr7lW25i/+mq6H6CsdR9XjvZaUZUNp0LfE0PzwTgqhPRbzKA1zwm/Rrn9TBjQ8uy9YNJAO4GcDuAFAA9APQEEA2g3IkUiHf9Ahl4I51rZZLvk+tQbVqr63KIyJbZwXNWb6YxqZprtbKi9QjLTq91qZP4PO8BcKfDi+cKGnzG8Z4TPGZR/YLZd4mApUkkAV8o0NcngTwRx5rOZ1NkXKmq+f9fngP+oqo9aHQ+n8UD/n2vWlVLFKMjgMUAfgGgPYBtAL4CkALgPIAGRn59AWQSg2yPUQ2f0fBetUfU9JB5ZiUTmCCAN4oYvPP0Jq+OOdK5j+pZuB0JJJ7OkS3w3DnMmZdIxnE4V9B4y3xOx+PH80nOvYsE/MJ8zklVRVEh/qsBFEkY5gaSjjLw5LPcZtDvTg7RvE9QO4Zjexl3FoO0UIC4S6m6nrLY2zyRUaVOg/3YY85jAFMmGEzgncfr6uJB+PnGLgE/MNs01teBcJ9FniuUxhYH0zJLRfLVpQQxGsD7PmTseXYOGhljXv+3x3NdIUkC5ZfoBVSPsRfvZZInOWX3QxbvlMdnzzY0Z7pHG2eBpH4oDiRPGpqYdZr7R3LJBSI4QbvfNDSA+jHd62Zxja2KuDDLZBqkC6Xt0RrCQgvZO2AUhkVqX/YWyKc6E67TZ3Q+24OGphRfBOKTVoZPmB0UxJgU1+ZPeWVXJwcDXfHY8CGG5rN2SnJwDjtIYuYx5bDGIoLtkghO9+Fd6uYPWOcbUw3NpcHrplnb4OeRNw9pnGiDrk1Kba9E3l1vyDGP2rnFaA/W8c1BjBbcdTxukU93M2SL1U79LADj1d/3A/gfgL0Alqm/PwygG4CtALoCKKR2rwBI4F9b/MZYRVXPiXF5ixPj0wLXDlBvNg3xh/nkzHYCBvF5jpBrzG+p/NpA8hhG4xUBKIpQAGbL+NR1AiRXQpW8UqDfswKeHr7aY2L0JTFnMY3fJUCyhQJtvM4OROZYbbV3eQRgKIC5gvPnIcmRXlPl2VyLdKxQA5Ey75Ei0Ob9TRnGBSxOhxM4/d5VpWRu58fDTwfw28hS7LpAxUF0sRVs5DRFQhHPubXVZ/uTDQ2cxgBYw1wgl6Kqn/kUgB3k1HWamkC5Ih3JXkNO/BmVRKYKfK2eMFcR2I4Qyfec6DQF4CFRc2qMImE+oW5w3Mng3AKRh88rkI1TLzBhvJBLjsM5Y7F2CiqoUu3Cd+m654sYhRr0ZC7VhxYnfXdx9BZVv1ZEVxHt/XL+ksBzY0m+TRFIQ7OYAnfVkfAiAcPdCB/vJeZEJI0+BcRGBRLXfiZx/Q3NJ7Ilrm8W8o0u8K0NFCQ/BVClbrhZ4LodTAqxFgAeEjCMdqy59u7EFJEe27vSfPQ3ncrp5jxHIYr7mNxrpNzKP6mP5JDUKBNIUR9lqk2dZYkpTB4tY10o6lSDBNosVm1kE9Ntsh/YAwQqBrZo6h9VcewcZ3/KJfAEgF/y3qxbD3nTKYtsotQcovlMDXU67HPWVSjFvyvw/GcpYHvXSb5c5zJEccqxS/dZDjnV0xJEXUEyKaT+uScEY8VXItOoZD2PRRpJL4F7pQsk6j1ZZmGznwA8JmBXpapqc91AJt7D69cP+RXxH6v/bwbwq3D0bzRZ86HkK/JI4i5ixOZWn7dpYiW3BguwG0Qm5y0J9fSdoJ9xfQSXJZq+bCCUQzufhLOXkswZ9pPDfy8CEM1zmbJIdm+c0hhHHzXkS5KYPXuO9/HqpCc5vZ59rGSyWcW+jXJyLDfQLRG9idMR6LJXkE9ZKDiZ5+lNLjXyM67Vqm0lBwUZL1HhXo1RvhzBXKKzB6Rw3vE9zsYLYjDJcw+FmyFnKjm5p5qCnc8B/JZeOxojJJL0GyfgOYkmHJEVRdX2KSdxJvr10x2ChJdBbrOTDSKKVpjE4BDfxEoKWnbzWbRU1T2ccX6ZrjGdkfNUBjXJBdIYxKC8QMJqpOpZ+mVJYVTw0/0Ao80CgXDxGg2I9GIhXPcLTXpB5/0lJfA0g2oe2ck6BSLnfU/QWnB+pVOyF02NUzXLrq6Xl1y+Rp8x19C0RvWC0k1BnHsmT/U1aQfwcMPFWJq+K3UoWaPYM3aqsjuKO2ebRE5CUv+FAZeKQz2aVwTQ8URqCwnqlC2TmmRSJF8qkZcPkPCNB5j3d7OV5Dkmn0kSwWGY6pI+mqV2HLs4OzNsJ6eHDxTIW7kO7OV0D4oGK2nGT/ZvbFVlDIf3S0XJ6zARz1S/d3T9C0AfTSCVSm/1kcCzEjQn0pYJJNhXGZNY/LtcItDsYN0kfpvHkLl6RlNGJ4G2nyh9X8+Uu4IjbxfwqZQA5Xb0PQoFgrQs5oIiO7OaTp+Vwa3cS+onaK5vB9AVwjkCIWlygDy9k4E0MbTwILtpjHsBrKBgJdaH2RRrTt0lbUjJGDM5/1Ij4kQjRYjt2gWYUPU9jRLIM4oFnj2Y3Ny9PoFhP0bpPYLGk00iL440XEt+5a8QkxkpLMd4kYMI24qU+d+1WuC3IjR+UVBC8rGCc55Zgg7vNzZSC9zs85fSZXKbdBpXLFw4UEb1HwJtDrTbRyjv0+XoLYr6njSB1GUgRV5uB0jZdM5oTbsptznGrM3hgqfC1H7XK1hjK0Bfds+xJIZY1l5jFZ04i9qxhW0NIfHlUhR6jknXPYLkNYrEOkOQ0B9u6mEoMiCv5BxiCGJOgMrxY8YlCUzIkh2+KBhBNbqWM+kQAe1cxrSL/fuEgK8JJpGdgQCb0QMEpRtm9TXf32eJO4YzsF2B4kUOd8Mqi9eKWOcFI5VSS9fPtVjPutHrNwF3aTrRNTZqlrr0bqYwkXj4OUhgLWZuFUwPYhfUCgWYuQ6l2S3eBrDERwS7lHtLsQGWxp4xNAFYRnlzNSN6L2dFPVVzSLmUUZm4MmXfTMbkFj+vmtjuseq5UsDJSpnrHqMopEtgQuQwbw0kVS5WT/nF1QwyiQLBUSdGGksp1qY2RQE0dC4JJ4LlWzVHVl1YpNmOeE9T/q0kGXxEi1uWCijt3gK1mW1MDmKEwxO1dQCf6l7MsyD/YKJp1vk/pP6+j8rBpRTxRlJpxXHUu5HaVzIKT2QE/QGAXoZk5r1P4NkLqNfRXvDEViVz4Vj+ZjSAgS7SuYwC6yqXwn42VWE/g+dJNWI/zThFYLbjQp9A9YsRWsB+ZHXWwvMiKKuipRNDm3RyW5HSzVyXQMtmHtMdwCsSLzKdSrSGTWcq98d6Kxb7a9dGDpq+g8kVzjAXVpIsnUzCLgv0wfcRfj5rFkffGXTy6QJgHpd7T9CwZ+nIymkfOZM2jKRa1O4c3kN7gLkLgO+Y0yZzcJ40p2eqJRQIcPmGRK4eb0FW+5igXdI48S9q/QN1mVjnZwzJWqQF7KbUOt9o5POPGprJNtYYPv6TnZI/QSCJUq2/TJM/F5oQZx8NlXDEyxdlBD1Tgjg7SrbtWvQxALjJx7E9R80s6fX2cwAvGgG+YiKaeQJkXBjIQCgXXUO/OdqjTb8QYZ9ZK3gG7DH60kCK3lYbcFwRU8dYzU7lZR9+ZVRzbH6Z2m8FcNPVoKYfECS6TJbQdP7nnYMXD7gU8X0TcYeQoJPfDOCDpgyEFmGb24DzfepCyDO4EHOkgB/JoACo07aMIB3p+/9tnGsTvW8I04e2AH4H4D+08bKMgjZKPBv5yzGJXCIL36WZC41+lCbMreDNF5GCX2E7UMIRtVrG0SoR4tcCNjR5FzIqoMqFsNPpmHsZ+9XRnJ+Tv/ZpnstZpM22ZnNW02MRKM2O8Gh/+3Wps4hMXhBwzl0C9wgGuHcMBz87Fy7qdSNJYKXmm6AiuH4zWmACcEUgrZzuRVrp/H5TBjp8h++AeqppE95Ggb3hC6wwWWAcU5kKtlYbKxGdw/eD913sFOhb8Mxno4cdm3KP3xkIwHEe9/M66PURo9jKtc52g4cTxQD+JDm7O9PEORdFvGP42J6TPrF1jIl+G1c2GMSFE/I+l31QOJ3cWXK9SCUd/2gD9+9Fni5VXc0Vuk6ap67m76q82m59qVlg0/JyTWQ9yiVtDvf67p1fR1rEzCl3c1CtVPXKswPsTTt3MLgaEXfocw1SqCa3FZ/B0faVXS1lIYk5zmjmZWwFnGH1u2nONzTjIXRLr4lT9D9jaTYBcF2bGgAAAABJRU5ErkJggg==`;
  
  // Generate the HTML content
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Peach Archive - ${mockArchiveData.metadata.username}</title>
  <style>
    ${cssContent}
  </style>
</head>
<body>
  <header>
    <div class="logo-container">
      <img src="data:image/png;base64,${peachLogoBase64}" alt="Peach Logo" class="logo">
      <h1>Peach Archive</h1>
    </div>
    <div class="user-info">
      <span class="username">@${mockArchiveData.metadata.username}</span>
      <span class="export-date">Exported: ${new Date(mockArchiveData.metadata.exportDate).toLocaleDateString()}</span>
    </div>
  </header>
  
  <div class="search-bar">
    <div class="search-container">
      <div class="search-field">
        <label for="search-input">Search posts:</label>
        <input type="text" id="search-input" placeholder="Search by content...">
      </div>
      <div class="time-filter">
        <div class="year-filter">
          <label for="year-select">Year:</label>
          <select id="year-select">
            <option value="">All Years</option>
            <!-- Will be populated by JavaScript -->
          </select>
        </div>
        <div class="month-filter">
          <label for="month-select">Month:</label>
          <select id="month-select">
            <option value="">All Months</option>
            <option value="0">January</option>
            <option value="1">February</option>
            <option value="2">March</option>
            <option value="3">April</option>
            <option value="4">May</option>
            <option value="5">June</option>
            <option value="6">July</option>
            <option value="7">August</option>
            <option value="8">September</option>
            <option value="9">October</option>
            <option value="10">November</option>
            <option value="11">December</option>
          </select>
        </div>
      </div>
      <div class="search-buttons">
        <button id="search-btn">Search</button>
        <button id="reset-btn">Reset</button>
      </div>
    </div>
  </div>
  
  <main>
    <div class="stats">
      <div class="stat">
        <span class="stat-value">${mockArchiveData.metadata.postCount}</span>
        <span class="stat-label">Total Posts</span>
      </div>
      <div class="stat">
        <span class="stat-value" id="visible-posts">${mockArchiveData.metadata.postCount}</span>
        <span class="stat-label">Visible Posts</span>
      </div>
      <div class="stat">
        <span class="stat-value" id="emoji-count">-</span>
        <span class="stat-label">Emojis</span>
      </div>
      <div class="stat">
        <span class="stat-value" id="active-days">-</span>
        <span class="stat-label">Active Days</span>
      </div>
    </div>
    
    <div class="fun-stats">
      <h3>Fun Stats</h3>
      <div class="fun-stats-grid">
        <div class="fun-stat" id="top-emojis">
          <h4>Top Emojis</h4>
          <div class="emoji-list">Loading...</div>
        </div>
        <div class="fun-stat" id="word-count">
          <h4>Word Stats</h4>
          <div class="word-stats">Loading...</div>
        </div>
        <div class="fun-stat" id="activity-chart">
          <h4>Activity by Time</h4>
          <div class="activity-data">Loading...</div>
        </div>
      </div>
    </div>
    
    <div class="timeline" id="timeline">
      <!-- Posts will be inserted here by JavaScript -->
      <div class="loading">Loading posts...</div>
    </div>
  </main>
  
  <footer>
    <p>Created with Peach Preserves - © 2025 jcbbge</p>
  </footer>
  
  <!-- Embed the archive data directly in the HTML -->
  <script>
    // This allows the viewer to work completely offline
    const ARCHIVE_DATA_JSON = ${archiveDataJson};
  </script>
  
  <script>
    ${jsContent}
  </script>
</body>
</html>`;

  // Return both the pure HTML content and the archive data
  return {
    htmlContent,
    archiveData: mockArchiveData
  };
});

export function routeData() {
  return useViewerData();
}

export default function ViewerTest() {
  const data = useRouteData<typeof useViewerData>();
  const [viewerHtml, setViewerHtml] = createSignal("");
  
  onMount(() => {
    if (data?.htmlContent) {
      setViewerHtml(data.htmlContent);
    }
  });
  
  return (
    <>
      <Title>Peach Archive Viewer Test</Title>
      
      {/* Display the HTML directly using an iframe */}
      <div style={{ 
        "height": "100vh", 
        "display": "flex", 
        "flex-direction": "column"
      }}>
        <div style={{ 
          "padding": "10px",
          "background": "#f5f5f5", 
          "border-bottom": "1px solid #ddd"
        }}>
          <h1 style={{ "margin": "0", "font-size": "16px" }}>Peach Archive Viewer Test</h1>
          <p style={{ "margin": "5px 0", "font-size": "14px" }}>
            This is the exact viewer.html that will be generated for the archive.
            Any changes made to the template will be reflected here.
          </p>
        </div>
        
        <iframe 
          style={{ 
            "flex": "1", 
            "border": "none", 
            "width": "100%"
          }}
          srcdoc={viewerHtml()}
          title="Peach Archive Viewer Preview"
        />
      </div>
    </>
  );
}